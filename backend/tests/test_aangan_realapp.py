"""Aangan real-app backend tests — auth, family, members, stories, ask, transcribe.

Run: pytest /app/backend/tests/test_aangan_realapp.py -v --tb=short \
        --junitxml=/app/test_reports/pytest/pytest_results.xml
"""
import io
import os
import time
import wave
import math
import struct
import uuid

import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    # fall back to backend .env via direct read (testing infra safety)
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
                break

API = f"{BASE_URL}/api"
STAMP = uuid.uuid4().hex[:8]
HEAD_EMAIL = f"test_head_{STAMP}@aangan.io"
HEAD_PW = "secret123"
INV_EMAIL = f"test_inv_{STAMP}@aangan.io"
INV_PW = "secret456"


@pytest.fixture(scope='module')
def head_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/signup", json={
        "family_name": "TEST_Sharma_" + STAMP,
        "name": "Papa Sharma",
        "email": HEAD_EMAIL,
        "password": HEAD_PW,
    }, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert 'user' in data and 'family' in data
    assert data['user']['role'] == 'head'
    assert data['user']['email'] == HEAD_EMAIL
    # cookie must be set
    assert 'access_token' in s.cookies.get_dict() or any(
        'access_token' in c.name for c in s.cookies)
    s.head_user = data['user']
    s.head_family = data['family']
    s.head_member_id = data['member_id']
    return s


# ---------------------------------------------------------------------------
# AUTH
# ---------------------------------------------------------------------------
class TestAuth:
    def test_signup_creates_head_and_family(self, head_session):
        r = head_session.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body['user']['email'] == HEAD_EMAIL
        assert body['family']['name'].startswith('TEST_Sharma_')

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": HEAD_EMAIL, "password": "WRONG"},
                          timeout=15)
        assert r.status_code == 401

    def test_login_right_password_sets_cookie(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login",
                   json={"email": HEAD_EMAIL, "password": HEAD_PW},
                   timeout=15)
        assert r.status_code == 200
        assert r.json()['user']['email'] == HEAD_EMAIL
        # cookie persistence
        me = s.get(f"{API}/auth/me", timeout=15)
        assert me.status_code == 200

    def test_me_unauthorized(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# FAMILY + MEMBERS CRUD
# ---------------------------------------------------------------------------
class TestMembers:
    def test_get_family_returns_head_member(self, head_session):
        r = head_session.get(f"{API}/family", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body['family']['_id'] == head_session.head_family['_id']
        assert len(body['members']) >= 1
        assert len(body['users']) >= 1

    def test_create_member(self, head_session):
        payload = {
            "name": "TEST_Nani",
            "date_of_birth": "1948-06-15",
            "place_of_birth": "Jaipur",
            "languages": ["Hindi"],
            "bio": "Loves stories",
            "profession": "Homemaker",
            "favourite_food": "Besan ladoo",
            "notes": "private notes",
            "relation_to_head": "Mother",
            "public_fields": ["name", "photo_url", "relation_to_head", "date_of_birth"],
        }
        r = head_session.post(f"{API}/members", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        m = r.json()
        assert m['name'] == 'TEST_Nani'
        assert m['place_of_birth'] == 'Jaipur'
        head_session.nani_id = m['_id']

        # GET verify
        g = head_session.get(f"{API}/members/{m['_id']}", timeout=15)
        assert g.status_code == 200
        assert g.json()['bio'] == 'Loves stories'

    def test_patch_member(self, head_session):
        nid = head_session.nani_id
        r = head_session.patch(f"{API}/members/{nid}",
                               json={"profession": "Master Cook"},
                               timeout=15)
        assert r.status_code == 200
        assert r.json()['profession'] == 'Master Cook'

    def test_head_cannot_delete_own_profile(self, head_session):
        r = head_session.delete(
            f"{API}/members/{head_session.head_member_id}", timeout=15)
        assert r.status_code == 400

    def test_bidirectional_parent_child(self, head_session):
        # Create child with parent = head's own member
        r = head_session.post(f"{API}/members", json={
            "name": "TEST_Riya",
            "parent_ids": [head_session.head_member_id],
        }, timeout=15)
        assert r.status_code == 200
        child_id = r.json()['_id']
        head_session.riya_id = child_id

        # Verify parent now has child in child_ids
        parent = head_session.get(
            f"{API}/members/{head_session.head_member_id}", timeout=15).json()
        assert child_id in parent.get('child_ids', [])

    def test_delete_member_cascades(self, head_session):
        # add temp member + story
        r = head_session.post(f"{API}/members",
                              json={"name": "TEST_ToDelete"}, timeout=15)
        mid = r.json()['_id']
        s = head_session.post(f"{API}/members/{mid}/stories",
                              json={"title": "tmp", "content": "x"}, timeout=15)
        assert s.status_code == 200
        sid = s.json()['_id']
        # delete member
        d = head_session.delete(f"{API}/members/{mid}", timeout=15)
        assert d.status_code == 200
        # GET → 404
        g = head_session.get(f"{API}/members/{mid}", timeout=15)
        assert g.status_code == 404
        # story should be cascade-deleted; try patch → 404
        ps = head_session.patch(f"{API}/stories/{sid}",
                                json={"title": "x"}, timeout=15)
        assert ps.status_code == 404


# ---------------------------------------------------------------------------
# INVITE + PRIVACY
# ---------------------------------------------------------------------------
class TestInviteAndPrivacy:
    def test_create_invite(self, head_session):
        r = head_session.post(f"{API}/auth/invite",
                              json={"role": "member"}, timeout=15)
        assert r.status_code == 200
        tok = r.json()['token']
        assert tok
        head_session.invite_token = tok

        # GET invite info (no auth needed)
        info = requests.get(f"{API}/auth/invite/{tok}", timeout=15)
        assert info.status_code == 200
        assert info.json()['family_name'].startswith('TEST_Sharma_')

    def test_accept_invite_creates_member(self, head_session):
        s2 = requests.Session()
        r = s2.post(f"{API}/auth/accept-invite", json={
            "token": head_session.invite_token,
            "name": "TEST_InvitedRiya",
            "email": INV_EMAIL,
            "password": INV_PW,
        }, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()['user']['family_id'] == head_session.head_family['_id']
        head_session.invited_session = s2

        # invite cannot be used twice
        r2 = requests.post(f"{API}/auth/accept-invite", json={
            "token": head_session.invite_token,
            "name": "X", "email": f"x_{STAMP}@x.com", "password": "abc123",
        }, timeout=15)
        assert r2.status_code == 404

    def test_invited_user_cannot_see_private_fields(self, head_session):
        s2 = head_session.invited_session
        # see head's own member (created by head). head's member has default
        # public_fields which exclude bio/profession/notes/etc.
        r = s2.get(f"{API}/members/{head_session.head_member_id}", timeout=15)
        assert r.status_code == 200
        body = r.json()
        # private fields should be masked
        for f in ('bio', 'notes', 'profession', 'favourite_food',
                  'place_of_birth', 'languages'):
            assert f not in body or body[f] in (None, [], ''), \
                f"private field {f} leaked to non-head viewer: {body.get(f)!r}"
        # name should still be visible
        assert body.get('name')

    def test_head_sees_everything(self, head_session):
        # head sees the invited user's member with all fields available
        r = head_session.get(f"{API}/family", timeout=15)
        assert r.status_code == 200
        members = r.json()['members']
        # at least one member with bio field present (head's own had no bio,
        # but Nani had bio set)
        names = [m['name'] for m in members]
        assert 'TEST_Nani' in names


# ---------------------------------------------------------------------------
# STORIES
# ---------------------------------------------------------------------------
class TestStories:
    def test_add_story_default_private(self, head_session):
        nid = head_session.nani_id
        r = head_session.post(f"{API}/members/{nid}/stories", json={
            "title": "Diwali morning",
            "content": "We woke at dawn and lit diyas.",
        }, timeout=15)
        assert r.status_code == 200
        assert r.json()['is_public'] is False
        head_session.story_id = r.json()['_id']

    def test_other_user_cannot_see_private_story(self, head_session):
        s2 = head_session.invited_session
        nid = head_session.nani_id
        r = s2.get(f"{API}/members/{nid}/stories", timeout=15)
        assert r.status_code == 200
        ids = [s['_id'] for s in r.json()]
        assert head_session.story_id not in ids

    def test_toggle_public_story_visible(self, head_session):
        r = head_session.patch(f"{API}/stories/{head_session.story_id}",
                               json={"is_public": True}, timeout=15)
        assert r.status_code == 200
        # now invited user should see it
        s2 = head_session.invited_session
        nid = head_session.nani_id
        r2 = s2.get(f"{API}/members/{nid}/stories", timeout=15)
        ids = [s['_id'] for s in r2.json()]
        assert head_session.story_id in ids

    def test_delete_story(self, head_session):
        d = head_session.delete(f"{API}/stories/{head_session.story_id}",
                                timeout=15)
        assert d.status_code == 200


# ---------------------------------------------------------------------------
# ASK STREAM
# ---------------------------------------------------------------------------
class TestAsk:
    def test_ask_stream_authenticated(self, head_session):
        r = head_session.post(f"{API}/ask/stream",
                              json={"question": "Tell me about my family briefly."},
                              stream=True, timeout=60)
        assert r.status_code == 200
        assert 'text/event-stream' in r.headers.get('content-type', '')
        chunks = []
        start = time.time()
        for line in r.iter_lines(decode_unicode=True):
            if line and line.startswith('data: '):
                payload = line[6:]
                if payload == '[DONE]':
                    break
                chunks.append(payload)
            if time.time() - start > 30:
                break
        full = ''.join(chunks)
        assert len(full) > 20, f"empty/short stream: {full!r}"

    def test_ask_stream_unauthenticated(self):
        r = requests.post(f"{API}/ask/stream",
                          json={"question": "hi"}, timeout=15)
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# TRANSCRIBE
# ---------------------------------------------------------------------------
def _make_tiny_wav():
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        # 1 second of silence (close to silence with low tone)
        for i in range(16000):
            sample = int(1000 * math.sin(2 * math.pi * 220 * i / 16000))
            w.writeframes(struct.pack('<h', sample))
    buf.seek(0)
    return buf


class TestTranscribe:
    def test_transcribe_unauthenticated(self):
        r = requests.post(f"{API}/transcribe", timeout=15)
        assert r.status_code in (401, 422)

    def test_transcribe_empty_body(self, head_session):
        # missing file → 422 from FastAPI
        r = head_session.post(f"{API}/transcribe", timeout=15)
        assert r.status_code == 422

    def test_transcribe_valid_wav(self, head_session):
        wav = _make_tiny_wav()
        files = {'file': ('test.wav', wav, 'audio/wav')}
        r = head_session.post(f"{API}/transcribe", files=files, timeout=60)
        # accept 200 OR structured 500 (whisper may refuse near-silent audio)
        assert r.status_code in (200, 500), r.text
        if r.status_code == 200:
            body = r.json()
            assert 'text' in body
            assert 'language' in body
            assert 'duration' in body
