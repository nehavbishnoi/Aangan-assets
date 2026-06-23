"""Aangan iteration 3 backend tests — recipes, cultures, rituals, stories aggregator,
upcoming-events, sibling propagation, extended_relations, delete cascade.

Run: pytest /app/backend/tests/test_aangan_iteration3.py -v --tb=short \
        --junitxml=/app/test_reports/pytest/pytest_results.xml
"""
import os
import uuid
from datetime import date, timedelta

import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
                break

API = f"{BASE_URL}/api"
STAMP = uuid.uuid4().hex[:8]
HEAD_EMAIL = f"it3_head_{STAMP}@aangan.io"
HEAD_PW = "secret123"
INV_EMAIL = f"it3_inv_{STAMP}@aangan.io"
INV_PW = "secret456"


# ---------- shared fixtures ----------
@pytest.fixture(scope='module')
def head():
    s = requests.Session()
    r = s.post(f"{API}/auth/signup", json={
        "family_name": "TEST_It3_" + STAMP,
        "name": "Papa", "email": HEAD_EMAIL, "password": HEAD_PW,
    }, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    s.head_user = data['user']
    s.head_family = data['family']
    s.head_member_id = data['member_id']
    return s


@pytest.fixture(scope='module')
def invited(head):
    # head creates invite, second user accepts as 'member'
    r = head.post(f"{API}/auth/invite", json={"role": "member"}, timeout=15)
    tok = r.json()['token']
    s = requests.Session()
    r2 = s.post(f"{API}/auth/accept-invite", json={
        "token": tok, "name": "Sibling", "email": INV_EMAIL, "password": INV_PW,
    }, timeout=15)
    assert r2.status_code == 200, r2.text
    s.user = r2.json()['user']
    s.member_id = r2.json()['member_id']
    return s


# ============================================================================
# Recipes CRUD + privacy
# ============================================================================
class TestRecipes:
    def test_create_recipe(self, head):
        r = head.post(f"{API}/recipes", json={
            "title": "Besan Ladoo",
            "occasions": ["Diwali"],
            "ingredients": ["1 cup besan"],
            "steps": ["Warm the kadhai"],
            "story": "Nani learned this.",
            "is_public": True,
        }, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d['title'] == 'Besan Ladoo'
        assert d['is_public'] is True
        assert d['occasions'] == ["Diwali"]
        head.public_recipe_id = d['_id']

    def test_create_private_recipe(self, head):
        r = head.post(f"{API}/recipes", json={
            "title": "Secret Chai", "is_public": False,
        }, timeout=15)
        assert r.status_code == 200
        head.private_recipe_id = r.json()['_id']

    def test_list_recipes_owner_sees_all(self, head):
        r = head.get(f"{API}/recipes", timeout=15)
        assert r.status_code == 200
        ids = [d['_id'] for d in r.json()]
        assert head.public_recipe_id in ids
        assert head.private_recipe_id in ids

    def test_get_recipe(self, head):
        r = head.get(f"{API}/recipes/{head.public_recipe_id}", timeout=15)
        assert r.status_code == 200
        assert r.json()['title'] == 'Besan Ladoo'

    def test_patch_recipe(self, head):
        r = head.patch(f"{API}/recipes/{head.public_recipe_id}",
                       json={"cuisine": "North Indian"}, timeout=15)
        assert r.status_code == 200
        # verify via GET
        g = head.get(f"{API}/recipes/{head.public_recipe_id}", timeout=15)
        assert g.json()['cuisine'] == 'North Indian'

    def test_non_owner_sees_only_public(self, head, invited):
        r = invited.get(f"{API}/recipes", timeout=15)
        assert r.status_code == 200
        ids = [d['_id'] for d in r.json()]
        assert head.public_recipe_id in ids
        assert head.private_recipe_id not in ids

    def test_non_owner_cannot_get_private(self, head, invited):
        r = invited.get(f"{API}/recipes/{head.private_recipe_id}", timeout=15)
        assert r.status_code == 404

    def test_non_owner_cannot_edit(self, head, invited):
        r = invited.patch(f"{API}/recipes/{head.public_recipe_id}",
                          json={"title": "hax"}, timeout=15)
        assert r.status_code == 403

    def test_delete_recipe(self, head):
        # create then delete
        c = head.post(f"{API}/recipes", json={"title": "TEMP_del"}, timeout=15)
        rid = c.json()['_id']
        d = head.delete(f"{API}/recipes/{rid}", timeout=15)
        assert d.status_code == 200
        g = head.get(f"{API}/recipes/{rid}", timeout=15)
        assert g.status_code == 404


# ============================================================================
# Cultures CRUD
# ============================================================================
class TestCultures:
    def test_create_culture(self, head):
        # Set when_date to tomorrow for upcoming-events test
        tomorrow = (date.today() + timedelta(days=2)).isoformat()
        r = head.post(f"{API}/cultures", json={
            "title": "Our Diwali Morning",
            "kind": "festival",
            "description": "Lights, sweets, family",
            "when_rule": "First day of Diwali",
            "when_date": tomorrow,
            "annual": True,
            "story": "Nani used to light first diya.",
            "is_public": True,
        }, timeout=15)
        assert r.status_code == 200, r.text
        head.culture_id = r.json()['_id']
        head.culture_when = tomorrow

    def test_list_cultures(self, head):
        r = head.get(f"{API}/cultures", timeout=15)
        assert r.status_code == 200
        assert any(d['_id'] == head.culture_id for d in r.json())

    def test_non_owner_sees_public_culture(self, head, invited):
        r = invited.get(f"{API}/cultures", timeout=15)
        assert r.status_code == 200
        ids = [d['_id'] for d in r.json()]
        assert head.culture_id in ids


# ============================================================================
# Rituals CRUD
# ============================================================================
class TestRituals:
    def test_create_ritual(self, head):
        r = head.post(f"{API}/rituals", json={
            "title": "Sunday call to Nani",
            "frequency": "weekly",
            "description": "Phone call every Sunday at 10am",
            "story": "Began after grandpa.",
            "is_public": False,
        }, timeout=15)
        assert r.status_code == 200, r.text
        head.ritual_id = r.json()['_id']

    def test_non_owner_cannot_see_private_ritual(self, head, invited):
        r = invited.get(f"{API}/rituals", timeout=15)
        assert r.status_code == 200
        ids = [d['_id'] for d in r.json()]
        assert head.ritual_id not in ids

    def test_patch_ritual_public(self, head):
        r = head.patch(f"{API}/rituals/{head.ritual_id}",
                       json={"is_public": True}, timeout=15)
        assert r.status_code == 200
        g = head.get(f"{API}/rituals/{head.ritual_id}", timeout=15)
        assert g.json()['is_public'] is True


# ============================================================================
# Stories aggregator
# ============================================================================
class TestStoriesAggregator:
    def test_all_stories_includes_all_kinds(self, head):
        # ensure there's at least one member_story too
        # Create a member, then a public story on them
        m = head.post(f"{API}/members", json={"name": "TEST_StoryGuy"}, timeout=15).json()
        head.post(f"{API}/members/{m['_id']}/stories",
                  json={"title": "Migration day", "content": "We moved in 1985.",
                        "is_public": True}, timeout=15)
        r = head.get(f"{API}/stories/all", timeout=15)
        assert r.status_code == 200
        feed = r.json()
        kinds = {row['kind'] for row in feed}
        # public recipe + public culture + public-now ritual + member_story
        assert 'recipe' in kinds
        assert 'culture' in kinds
        assert 'ritual' in kinds
        assert 'member_story' in kinds
        # each row has required shape
        for row in feed:
            assert '_id' in row and 'title' in row and 'link' in row
            assert 'is_public' in row and 'created_at' in row

    def test_invited_sees_only_public_in_feed(self, head, invited):
        r = invited.get(f"{API}/stories/all", timeout=15)
        assert r.status_code == 200
        feed = r.json()
        for row in feed:
            # invited didn't create any of these. So all visible ones must be public.
            if row.get('created_by') != invited.user['_id']:
                assert row.get('is_public') is True, f"private leak: {row}"


# ============================================================================
# Upcoming events
# ============================================================================
class TestUpcomingEvents:
    def test_birthday_tomorrow(self, head):
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        m = head.post(f"{API}/members", json={
            "name": "TEST_BdayKid",
            "date_of_birth": tomorrow,
        }, timeout=15).json()
        r = head.get(f"{API}/upcoming-events", timeout=15)
        assert r.status_code == 200
        events = r.json()
        # sorted ascending by days
        days_list = [e['days'] for e in events]
        assert days_list == sorted(days_list)
        # find our birthday — days should be 1
        bday = [e for e in events if e['kind'] == 'birthday'
                and m['_id'] in e['link']]
        assert bday, f"birthday event missing: {events}"
        assert bday[0]['days'] == 1
        assert 'TEST_BdayKid' in bday[0]['title']

    def test_culture_event_included(self, head):
        r = head.get(f"{API}/upcoming-events", timeout=15)
        events = r.json()
        # the culture created earlier was when_date = today+2 days
        culture_evs = [e for e in events if e['kind'] == 'culture']
        assert culture_evs, "no culture event surfaced"
        titles = [e['title'] for e in culture_evs]
        assert 'Our Diwali Morning' in titles


# ============================================================================
# Sibling propagation + extended_relations + delete cascade
# ============================================================================
class TestRelations:
    def test_sibling_propagation(self, head):
        a = head.post(f"{API}/members", json={"name": "TEST_SibA"}, timeout=15).json()
        b = head.post(f"{API}/members",
                      json={"name": "TEST_SibB", "sibling_ids": [a['_id']]},
                      timeout=15).json()
        # A should now have B in its sibling_ids
        a_now = head.get(f"{API}/members/{a['_id']}", timeout=15).json()
        assert b['_id'] in (a_now.get('sibling_ids') or [])
        # B obviously has A
        assert a['_id'] in (b.get('sibling_ids') or [])
        head.sib_a, head.sib_b = a['_id'], b['_id']

    def test_extended_relations_saved(self, head):
        rels = [{"member_id": head.head_member_id, "label": "Chacha"}]
        r = head.post(f"{API}/members", json={
            "name": "TEST_Nephew",
            "extended_relations": rels,
        }, timeout=15)
        assert r.status_code == 200, r.text
        out = r.json()
        assert out['extended_relations'] == rels
        # GET also returns it
        g = head.get(f"{API}/members/{out['_id']}", timeout=15).json()
        assert g['extended_relations'] == rels

    def test_delete_member_pulls_sibling_refs(self, head):
        # delete SibA → SibB should no longer have it
        d = head.delete(f"{API}/members/{head.sib_a}", timeout=15)
        assert d.status_code == 200
        b_now = head.get(f"{API}/members/{head.sib_b}", timeout=15).json()
        assert head.sib_a not in (b_now.get('sibling_ids') or [])
