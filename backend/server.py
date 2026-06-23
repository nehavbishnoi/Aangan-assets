"""Aangan backend — auth, family, members, stories, ask-aangan, waitlist, transcription."""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File, Depends
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from io import BytesIO

from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
from emergentintegrations.llm.openai import OpenAISpeechToText

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = 'HS256'

app = FastAPI(title="Aangan API")
api_router = APIRouter(prefix="/api")


# ============================================================================
# Auth helpers
# ============================================================================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))


def create_access_token(user_id: str, family_id: str) -> str:
    payload = {
        'sub': user_id,
        'family_id': family_id,
        'exp': datetime.now(timezone.utc) + timedelta(days=14),
        'type': 'access',
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key='access_token',
        value=token,
        httponly=True,
        secure=True,
        samesite='lax',
        max_age=14 * 24 * 3600,
        path='/',
    )


def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(key='access_token', path='/')


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get('access_token')
    if not token:
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail='Not authenticated')
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get('type') != 'access':
            raise HTTPException(status_code=401, detail='Invalid token type')
        user = await db.users.find_one({'_id': payload['sub']}, {'password_hash': 0})
        if not user:
            raise HTTPException(status_code=401, detail='User not found')
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Token expired')
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail='Invalid token')


# ============================================================================
# Models
# ============================================================================
class SignupReq(BaseModel):
    family_name: str
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class InviteCreateReq(BaseModel):
    role: Literal['member', 'viewer'] = 'member'
    note: Optional[str] = None


class AcceptInviteReq(BaseModel):
    token: str
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


PRIVATE_FIELDS = {'bio', 'notes', 'profession', 'favourite_food', 'languages', 'place_of_birth'}


class MemberIn(BaseModel):
    model_config = ConfigDict(extra='ignore')
    name: str
    photo_url: Optional[str] = None
    relation_to_head: Optional[str] = None  # human-readable
    gender: Optional[Literal['male', 'female', 'other']] = None
    date_of_birth: Optional[str] = None  # ISO
    place_of_birth: Optional[str] = None
    anniversary: Optional[str] = None  # ISO
    profession: Optional[str] = None
    favourite_food: Optional[str] = None
    languages: List[str] = Field(default_factory=list)
    bio: Optional[str] = None
    notes: Optional[str] = None
    # relationships
    parent_ids: List[str] = Field(default_factory=list)
    spouse_ids: List[str] = Field(default_factory=list)
    child_ids: List[str] = Field(default_factory=list)
    sibling_ids: List[str] = Field(default_factory=list)
    # extended_relations: free-form, e.g. [{"member_id": "...", "label": "Chachu"}]
    extended_relations: List[dict] = Field(default_factory=list)
    # visibility — which fields each viewer can see. default: identity public, sensitive private
    public_fields: List[str] = Field(default_factory=lambda: [
        'name', 'photo_url', 'relation_to_head', 'gender', 'date_of_birth', 'anniversary',
        'parent_ids', 'spouse_ids', 'child_ids', 'sibling_ids', 'extended_relations',
    ])


class RecipeIn(BaseModel):
    model_config = ConfigDict(extra='ignore')
    title: str
    owner_member_id: Optional[str] = None  # whose recipe
    occasions: List[str] = Field(default_factory=list)  # "Diwali", "Birthday", "Sunday lunch"
    cuisine: Optional[str] = None
    ingredients: List[str] = Field(default_factory=list)
    steps: List[str] = Field(default_factory=list)
    story: Optional[str] = None  # why we make it / origin
    photo_url: Optional[str] = None
    audio_data_url: Optional[str] = None
    language: Optional[str] = None
    is_public: bool = False


class CultureIn(BaseModel):
    """A festivity / tradition / celebration."""
    model_config = ConfigDict(extra='ignore')
    title: str  # "Our Diwali Morning"
    kind: Optional[str] = None  # "festival" | "ritual_of_passage" | "tradition" | "celebration"
    description: Optional[str] = None  # how we celebrate
    when_rule: Optional[str] = None  # human-readable, e.g. "First day of Diwali"
    when_date: Optional[str] = None  # if a fixed date, ISO YYYY-MM-DD (year may be a sentinel)
    annual: bool = True  # repeats yearly
    attendee_ids: List[str] = Field(default_factory=list)  # member ids
    food_recipe_ids: List[str] = Field(default_factory=list)
    story: Optional[str] = None  # the story behind it
    photo_url: Optional[str] = None
    audio_data_url: Optional[str] = None
    is_public: bool = False


class RitualIn(BaseModel):
    """A daily / weekly / monthly practice."""
    model_config = ConfigDict(extra='ignore')
    title: str
    frequency: Optional[Literal['daily', 'weekly', 'monthly', 'yearly', 'occasional']] = 'daily'
    description: Optional[str] = None  # the guideline / how it is done
    follower_ids: List[str] = Field(default_factory=list)  # members who follow it
    story: Optional[str] = None  # why this matters
    photo_url: Optional[str] = None
    is_public: bool = False


class StoryIn(BaseModel):
    title: str
    content: str = ''
    language: Optional[str] = None
    audio_data_url: Optional[str] = None  # base64 data URL if attached
    is_public: bool = False  # private by default — only the owner sees it


class AskRequest(BaseModel):
    question: str
    session_id: Optional[str] = None


class WaitlistCreate(BaseModel):
    name: str
    email: EmailStr
    family_role: Optional[str] = None
    note: Optional[str] = None
    source: Optional[str] = 'landing'


# Helpers to serialize Mongo docs (we use uuid strings as _id)
def _clean(doc):
    if doc is None:
        return None
    doc.pop('password_hash', None)
    return doc


def member_view(m: dict, viewer: dict) -> dict:
    """Filter member fields based on viewer permissions.

    - The OWNER of the member (created_by) sees everything.
    - The family HEAD sees everything.
    - Other family members see only `public_fields` + name + id + relations.
    """
    if m is None:
        return None
    is_owner = m.get('created_by') == viewer['_id'] or m.get('owner_user_id') == viewer['_id']
    is_head = viewer.get('role') == 'head'
    if is_owner or is_head:
        return m
    public = set(m.get('public_fields') or [])
    public.update({'name', '_id', 'id', 'family_id', 'created_at'})
    return {k: v for k, v in m.items() if k in public}


# ============================================================================
# Auth endpoints
# ============================================================================
@api_router.get('/')
async def root():
    return {'message': 'Aangan API', 'status': 'ok'}


@api_router.post('/auth/signup')
async def signup(payload: SignupReq, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({'email': email}):
        raise HTTPException(status_code=400, detail='An account with that email already exists')

    family_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    member_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    family_doc = {
        '_id': family_id,
        'name': payload.family_name,
        'head_user_id': user_id,
        'created_at': now,
    }
    user_doc = {
        '_id': user_id,
        'family_id': family_id,
        'email': email,
        'name': payload.name,
        'password_hash': hash_password(payload.password),
        'role': 'head',
        'member_id': member_id,
        'created_at': now,
    }
    head_member_doc = MemberIn(name=payload.name).model_dump()
    head_member_doc.update({
        '_id': member_id,
        'family_id': family_id,
        'created_by': user_id,
        'owner_user_id': user_id,
        'created_at': now,
    })

    await db.families.insert_one(family_doc)
    await db.users.insert_one(user_doc)
    await db.members.insert_one(head_member_doc)

    token = create_access_token(user_id, family_id)
    set_auth_cookie(response, token)
    user_doc.pop('password_hash', None)
    return {'user': user_doc, 'family': family_doc, 'member_id': member_id, 'token': token}


@api_router.post('/auth/login')
async def login(payload: LoginReq, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({'email': email})
    if not user or not verify_password(payload.password, user['password_hash']):
        raise HTTPException(status_code=401, detail='Wrong email or password')
    token = create_access_token(user['_id'], user['family_id'])
    set_auth_cookie(response, token)
    user.pop('password_hash', None)
    return {'user': user, 'token': token}


@api_router.post('/auth/logout')
async def logout(response: Response):
    clear_auth_cookie(response)
    return {'ok': True}


@api_router.get('/auth/me')
async def me(user: dict = Depends(get_current_user)):
    family = await db.families.find_one({'_id': user['family_id']})
    return {'user': user, 'family': family}


@api_router.post('/auth/invite')
async def create_invite(payload: InviteCreateReq, user: dict = Depends(get_current_user)):
    if user.get('role') != 'head':
        raise HTTPException(status_code=403, detail='Only the family head can invite members')
    token = secrets.token_urlsafe(24)
    doc = {
        '_id': token,
        'family_id': user['family_id'],
        'created_by': user['_id'],
        'role': payload.role,
        'note': payload.note,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'used_at': None,
    }
    await db.invites.insert_one(doc)
    return {'token': token, 'expires_in_days': 14}


@api_router.get('/auth/invite/{token}')
async def get_invite(token: str):
    invite = await db.invites.find_one({'_id': token})
    if not invite or invite.get('used_at'):
        raise HTTPException(status_code=404, detail='Invitation not found or already used')
    family = await db.families.find_one({'_id': invite['family_id']})
    return {'family_name': family['name'] if family else 'a family', 'role': invite.get('role', 'member')}


@api_router.post('/auth/accept-invite')
async def accept_invite(payload: AcceptInviteReq, response: Response):
    invite = await db.invites.find_one({'_id': payload.token})
    if not invite or invite.get('used_at'):
        raise HTTPException(status_code=404, detail='Invitation not found or already used')

    email = payload.email.lower()
    if await db.users.find_one({'email': email}):
        raise HTTPException(status_code=400, detail='Account already exists. Please log in.')

    user_id = str(uuid.uuid4())
    member_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    family_id = invite['family_id']

    user_doc = {
        '_id': user_id,
        'family_id': family_id,
        'email': email,
        'name': payload.name,
        'password_hash': hash_password(payload.password),
        'role': invite.get('role', 'member'),
        'member_id': member_id,
        'created_at': now,
    }
    member_doc = MemberIn(name=payload.name).model_dump()
    member_doc.update({
        '_id': member_id,
        'family_id': family_id,
        'created_by': user_id,
        'owner_user_id': user_id,
        'created_at': now,
    })

    await db.users.insert_one(user_doc)
    await db.members.insert_one(member_doc)
    await db.invites.update_one({'_id': payload.token}, {'$set': {'used_at': now, 'used_by': user_id}})

    token = create_access_token(user_id, family_id)
    set_auth_cookie(response, token)
    user_doc.pop('password_hash', None)
    return {'user': user_doc, 'token': token, 'member_id': member_id}


# ============================================================================
# Family / Members
# ============================================================================
@api_router.get('/family')
async def get_family(user: dict = Depends(get_current_user)):
    family = await db.families.find_one({'_id': user['family_id']})
    members_raw = await db.members.find({'family_id': user['family_id']}).to_list(500)
    members = [member_view(m, user) for m in members_raw]
    users = await db.users.find({'family_id': user['family_id']}, {'password_hash': 0}).to_list(200)
    return {'family': family, 'members': members, 'users': users}


@api_router.post('/members')
async def add_member(payload: MemberIn, user: dict = Depends(get_current_user)):
    member_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = payload.model_dump()
    doc.update({
        '_id': member_id,
        'family_id': user['family_id'],
        'created_by': user['_id'],
        'owner_user_id': user['_id'],
        'created_at': now,
    })
    await db.members.insert_one(doc)
    # bidirectional relations (best-effort)
    if payload.parent_ids:
        await db.members.update_many(
            {'_id': {'$in': payload.parent_ids}, 'family_id': user['family_id']},
            {'$addToSet': {'child_ids': member_id}},
        )
    if payload.spouse_ids:
        await db.members.update_many(
            {'_id': {'$in': payload.spouse_ids}, 'family_id': user['family_id']},
            {'$addToSet': {'spouse_ids': member_id}},
        )
    if payload.child_ids:
        await db.members.update_many(
            {'_id': {'$in': payload.child_ids}, 'family_id': user['family_id']},
            {'$addToSet': {'parent_ids': member_id}},
        )
    if payload.sibling_ids:
        await db.members.update_many(
            {'_id': {'$in': payload.sibling_ids}, 'family_id': user['family_id']},
            {'$addToSet': {'sibling_ids': member_id}},
        )
    return member_view(doc, user)


@api_router.get('/members/{member_id}')
async def get_member(member_id: str, user: dict = Depends(get_current_user)):
    m = await db.members.find_one({'_id': member_id, 'family_id': user['family_id']})
    if not m:
        raise HTTPException(status_code=404, detail='Member not found')
    return member_view(m, user)


@api_router.patch('/members/{member_id}')
async def update_member(member_id: str, payload: dict, user: dict = Depends(get_current_user)):
    m = await db.members.find_one({'_id': member_id, 'family_id': user['family_id']})
    if not m:
        raise HTTPException(status_code=404, detail='Member not found')
    # Only owner or head can edit
    if user.get('role') != 'head' and m.get('owner_user_id') != user['_id'] and m.get('created_by') != user['_id']:
        raise HTTPException(status_code=403, detail='Only the owner or family head can edit this member')

    allowed = {
        'name', 'photo_url', 'relation_to_head', 'gender', 'date_of_birth', 'place_of_birth',
        'anniversary', 'profession', 'favourite_food', 'languages', 'bio', 'notes',
        'parent_ids', 'spouse_ids', 'child_ids', 'sibling_ids', 'extended_relations',
        'public_fields',
    }
    updates = {k: v for k, v in payload.items() if k in allowed}
    if updates:
        await db.members.update_one({'_id': member_id}, {'$set': updates})
    new = await db.members.find_one({'_id': member_id})
    return member_view(new, user)


@api_router.delete('/members/{member_id}')
async def delete_member(member_id: str, user: dict = Depends(get_current_user)):
    m = await db.members.find_one({'_id': member_id, 'family_id': user['family_id']})
    if not m:
        raise HTTPException(status_code=404, detail='Member not found')
    if user.get('role') != 'head' and m.get('owner_user_id') != user['_id']:
        raise HTTPException(status_code=403, detail='Only the owner or family head can delete this member')
    if user.get('role') == 'head' and m.get('_id') == user.get('member_id'):
        raise HTTPException(status_code=400, detail="The family head's own profile cannot be deleted")
    await db.members.delete_one({'_id': member_id})
    # remove bidirectional refs
    await db.members.update_many(
        {'family_id': user['family_id']},
        {'$pull': {'parent_ids': member_id, 'spouse_ids': member_id, 'child_ids': member_id, 'sibling_ids': member_id}},
    )
    # delete stories belonging to this member
    await db.stories.delete_many({'member_id': member_id})
    return {'ok': True}


# ============================================================================
# Stories
# ============================================================================
@api_router.get('/members/{member_id}/stories')
async def list_stories(member_id: str, user: dict = Depends(get_current_user)):
    m = await db.members.find_one({'_id': member_id, 'family_id': user['family_id']})
    if not m:
        raise HTTPException(status_code=404, detail='Member not found')
    cursor = db.stories.find({'member_id': member_id}).sort('created_at', -1)
    rows = await cursor.to_list(200)
    # Filter privacy: viewer sees public stories + their own private stories + (if head) all
    out = []
    for s in rows:
        if s.get('is_public') or s.get('created_by') == user['_id'] or user.get('role') == 'head':
            out.append(s)
    return out


@api_router.post('/members/{member_id}/stories')
async def add_story(member_id: str, payload: StoryIn, user: dict = Depends(get_current_user)):
    m = await db.members.find_one({'_id': member_id, 'family_id': user['family_id']})
    if not m:
        raise HTTPException(status_code=404, detail='Member not found')
    sid = str(uuid.uuid4())
    doc = payload.model_dump()
    doc.update({
        '_id': sid,
        'member_id': member_id,
        'family_id': user['family_id'],
        'created_by': user['_id'],
        'created_at': datetime.now(timezone.utc).isoformat(),
    })
    await db.stories.insert_one(doc)
    return doc


@api_router.patch('/stories/{story_id}')
async def update_story(story_id: str, payload: dict, user: dict = Depends(get_current_user)):
    s = await db.stories.find_one({'_id': story_id, 'family_id': user['family_id']})
    if not s:
        raise HTTPException(status_code=404, detail='Story not found')
    if s.get('created_by') != user['_id'] and user.get('role') != 'head':
        raise HTTPException(status_code=403, detail='Only the author or family head can edit this story')
    allowed = {'title', 'content', 'language', 'audio_data_url', 'is_public'}
    updates = {k: v for k, v in payload.items() if k in allowed}
    if updates:
        await db.stories.update_one({'_id': story_id}, {'$set': updates})
    return await db.stories.find_one({'_id': story_id})


@api_router.delete('/stories/{story_id}')
async def delete_story(story_id: str, user: dict = Depends(get_current_user)):
    s = await db.stories.find_one({'_id': story_id, 'family_id': user['family_id']})
    if not s:
        raise HTTPException(status_code=404, detail='Story not found')
    if s.get('created_by') != user['_id'] and user.get('role') != 'head':
        raise HTTPException(status_code=403, detail='Not allowed')
    await db.stories.delete_one({'_id': story_id})
    return {'ok': True}


# ============================================================================
# Recipes / Cultures / Rituals — generic helpers
# ============================================================================
def _can_see(doc: dict, user: dict) -> bool:
    if user.get('role') == 'head':
        return True
    if doc.get('created_by') == user['_id']:
        return True
    return bool(doc.get('is_public'))


def _can_edit(doc: dict, user: dict) -> bool:
    return user.get('role') == 'head' or doc.get('created_by') == user['_id']


def _make_entity_routes(name: str, collection: str, model_cls):
    """Register list/create/get/patch/delete for a simple owned entity."""

    @api_router.get(f'/{name}')
    async def list_entities(user: dict = Depends(get_current_user)):
        rows = await db[collection].find({'family_id': user['family_id']}).sort('created_at', -1).to_list(500)
        return [r for r in rows if _can_see(r, user)]

    @api_router.post(f'/{name}')
    async def add_entity(payload: model_cls, user: dict = Depends(get_current_user)):
        doc = payload.model_dump()
        doc['_id'] = str(uuid.uuid4())
        doc['family_id'] = user['family_id']
        doc['created_by'] = user['_id']
        doc['created_at'] = datetime.now(timezone.utc).isoformat()
        await db[collection].insert_one(doc)
        return doc

    @api_router.get(f'/{name}/{{entity_id}}')
    async def get_entity(entity_id: str, user: dict = Depends(get_current_user)):
        d = await db[collection].find_one({'_id': entity_id, 'family_id': user['family_id']})
        if not d or not _can_see(d, user):
            raise HTTPException(status_code=404, detail='Not found')
        return d

    @api_router.patch(f'/{name}/{{entity_id}}')
    async def patch_entity(entity_id: str, payload: dict, user: dict = Depends(get_current_user)):
        d = await db[collection].find_one({'_id': entity_id, 'family_id': user['family_id']})
        if not d:
            raise HTTPException(status_code=404, detail='Not found')
        if not _can_edit(d, user):
            raise HTTPException(status_code=403, detail='Only the author or family head can edit this')
        allowed = set(model_cls.model_fields.keys())
        updates = {k: v for k, v in payload.items() if k in allowed}
        if updates:
            await db[collection].update_one({'_id': entity_id}, {'$set': updates})
        return await db[collection].find_one({'_id': entity_id})

    @api_router.delete(f'/{name}/{{entity_id}}')
    async def delete_entity(entity_id: str, user: dict = Depends(get_current_user)):
        d = await db[collection].find_one({'_id': entity_id, 'family_id': user['family_id']})
        if not d:
            raise HTTPException(status_code=404, detail='Not found')
        if not _can_edit(d, user):
            raise HTTPException(status_code=403, detail='Not allowed')
        await db[collection].delete_one({'_id': entity_id})
        return {'ok': True}


_make_entity_routes('recipes', 'recipes', RecipeIn)
_make_entity_routes('cultures', 'cultures', CultureIn)
_make_entity_routes('rituals', 'rituals', RitualIn)


@api_router.get('/stories/all')
async def all_stories(user: dict = Depends(get_current_user)):
    """Aggregate view: member-stories + recipes + cultures + rituals
    that this user can see, normalised into a single feed."""
    fid = user['family_id']
    member_stories = await db.stories.find({'family_id': fid}).to_list(1000)
    members = {m['_id']: m for m in await db.members.find({'family_id': fid}).to_list(1000)}
    recipes = await db.recipes.find({'family_id': fid}).to_list(500)
    cultures = await db.cultures.find({'family_id': fid}).to_list(500)
    rituals = await db.rituals.find({'family_id': fid}).to_list(500)

    feed = []
    for s in member_stories:
        if s.get('is_public') or s.get('created_by') == user['_id'] or user.get('role') == 'head':
            mem = members.get(s.get('member_id'), {})
            feed.append({
                'kind': 'member_story', '_id': s['_id'], 'title': s.get('title'),
                'content': s.get('content'), 'audio_data_url': s.get('audio_data_url'),
                'language': s.get('language'), 'is_public': s.get('is_public'),
                'created_at': s.get('created_at'), 'created_by': s.get('created_by'),
                'link': f"/app/family/{s.get('member_id')}",
                'about': mem.get('name'),
            })
    for r in recipes:
        if _can_see(r, user):
            owner = members.get(r.get('owner_member_id'), {})
            feed.append({
                'kind': 'recipe', '_id': r['_id'], 'title': r.get('title'),
                'content': r.get('story'), 'audio_data_url': r.get('audio_data_url'),
                'language': r.get('language'), 'is_public': r.get('is_public'),
                'created_at': r.get('created_at'), 'created_by': r.get('created_by'),
                'link': f"/app/recipes/{r['_id']}",
                'about': owner.get('name') or r.get('cuisine') or 'A family recipe',
                'tag': 'Recipe',
                'occasions': r.get('occasions'),
            })
    for c in cultures:
        if _can_see(c, user):
            feed.append({
                'kind': 'culture', '_id': c['_id'], 'title': c.get('title'),
                'content': c.get('story') or c.get('description'),
                'audio_data_url': c.get('audio_data_url'),
                'is_public': c.get('is_public'),
                'created_at': c.get('created_at'), 'created_by': c.get('created_by'),
                'link': f"/app/culture/{c['_id']}",
                'about': c.get('kind') or 'Tradition',
                'tag': 'Culture',
                'when_rule': c.get('when_rule'),
            })
    for rt in rituals:
        if _can_see(rt, user):
            feed.append({
                'kind': 'ritual', '_id': rt['_id'], 'title': rt.get('title'),
                'content': rt.get('story') or rt.get('description'),
                'is_public': rt.get('is_public'),
                'created_at': rt.get('created_at'), 'created_by': rt.get('created_by'),
                'link': f"/app/rituals/{rt['_id']}",
                'about': rt.get('frequency') or 'Ritual',
                'tag': 'Ritual',
            })
    feed.sort(key=lambda x: x.get('created_at') or '', reverse=True)
    return feed


@api_router.get('/upcoming-events')
async def upcoming_events(user: dict = Depends(get_current_user), days: int = 90):
    """Mix of birthdays, anniversaries, and culture events."""
    fid = user['family_id']
    members = await db.members.find({'family_id': fid}).to_list(1000)
    cultures = await db.cultures.find({'family_id': fid, 'annual': True}).to_list(500)
    today = datetime.now(timezone.utc).date()
    events = []

    def push(date_iso: str, kind: str, title: str, link: str, member: dict = None):
        if not date_iso:
            return
        try:
            d = datetime.fromisoformat(date_iso).date()
        except Exception:  # noqa: BLE001
            return
        next_occ = d.replace(year=today.year)
        if next_occ < today:
            next_occ = next_occ.replace(year=today.year + 1)
        diff = (next_occ - today).days
        if 0 <= diff <= days:
            events.append({'days': diff, 'date': next_occ.isoformat(), 'kind': kind, 'title': title, 'link': link})

    for m in members:
        push(m.get('date_of_birth'), 'birthday', f"{m.get('name')}'s birthday", f"/app/family/{m['_id']}")
        push(m.get('anniversary'), 'anniversary', f"{m.get('name')}'s anniversary", f"/app/family/{m['_id']}")
    for c in cultures:
        if _can_see(c, user):
            push(c.get('when_date'), 'culture', c.get('title'), f"/app/culture/{c['_id']}")
    events.sort(key=lambda x: x['days'])
    return events


# ============================================================================
# Whisper transcription
# ============================================================================
@api_router.post('/transcribe')
async def transcribe(file: UploadFile = File(...), language: Optional[str] = None,
                     user: dict = Depends(get_current_user)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail='LLM key not configured')
    raw = await file.read()
    if len(raw) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail='Audio file too large (max 25MB)')
    # Wrap in a BytesIO with a filename so the SDK can detect the mimetype
    bio = BytesIO(raw)
    bio.name = file.filename or 'audio.webm'

    stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
    try:
        kwargs = {'file': bio, 'model': 'whisper-1', 'response_format': 'verbose_json'}
        if language:
            kwargs['language'] = language
        resp = await stt.transcribe(**kwargs)
        return {
            'text': getattr(resp, 'text', '') or '',
            'language': getattr(resp, 'language', None),
            'duration': getattr(resp, 'duration', None),
        }
    except Exception as e:  # noqa: BLE001
        logger.exception('Transcription failed')
        raise HTTPException(status_code=500, detail=f'Transcription failed: {e}')


# ============================================================================
# Ask Aangan (existing) — now answers from the user's own family archive
# ============================================================================
ASK_AANGAN_SYSTEM_BASE = """You are Aangan — a warm, intelligent, gentle AI guide for a private family
culture and legacy archive.

Tone:
- Warm, poetic, intimate, never preachy, never religious, never corporate.
- Short, layered sentences. Plain English with occasional gentle Indian-family vocabulary.
- Never lecture. Honour the family's way of doing things.

Behaviour:
- Answer from the family's own archive first — never invent details.
- Cite sources naturally: "From Nani's voice note" or "Recorded by Papa".
- If something hasn't been recorded yet, gently say: "Your family hasn't shared that yet —
  would you like to record it now?"
- Keep responses to 3-6 short paragraphs.
- Never decide what is "right" for a family.
"""


async def _build_family_context(user: dict) -> str:
    members = await db.members.find({'family_id': user['family_id']}).to_list(200)
    stories = await db.stories.find({
        'family_id': user['family_id'],
        '$or': [{'is_public': True}, {'created_by': user['_id']}],
    }).sort('created_at', -1).to_list(200)
    lines = ['Family members in this archive:']
    for m in members:
        bits = [m.get('name')]
        if m.get('relation_to_head'):
            bits.append(f"({m['relation_to_head']})")
        if m.get('date_of_birth'):
            bits.append(f"born {m['date_of_birth']}")
        lines.append('- ' + ' '.join([b for b in bits if b]))
    if stories:
        lines.append('\nStories on file:')
        for s in stories[:40]:
            mem = next((mm for mm in members if mm['_id'] == s.get('member_id')), None)
            who = mem['name'] if mem else 'unknown'
            lines.append(f"- About {who} — \"{s.get('title')}\": {(s.get('content') or '')[:300]}")
    else:
        lines.append('\n(No stories recorded yet.)')
    return '\n'.join(lines)


@api_router.post('/ask/stream')
async def ask_stream(payload: AskRequest, user: dict = Depends(get_current_user)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail='LLM key not configured')
    ctx = await _build_family_context(user)
    system = ASK_AANGAN_SYSTEM_BASE + '\n\n' + ctx
    chat = LlmChat(api_key=EMERGENT_LLM_KEY,
                   session_id=payload.session_id or str(uuid.uuid4()),
                   system_message=system).with_model('anthropic', 'claude-sonnet-4-5-20250929')

    async def gen():
        try:
            async for ev in chat.stream_message(UserMessage(text=payload.question)):
                if isinstance(ev, TextDelta):
                    safe = ev.content.replace('\n', '\\n')
                    yield f"data: {safe}\n\n"
                elif isinstance(ev, StreamDone):
                    yield 'data: [DONE]\n\n'
                    break
        except Exception as e:  # noqa: BLE001
            logger.exception('Ask stream error')
            yield f'data: [ERROR] {e}\n\n'

    return StreamingResponse(gen(), media_type='text/event-stream', headers={
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
        'Connection': 'keep-alive',
    })


# Public demo endpoint (no auth) for the landing-page mockup
@api_router.post('/ask-demo')
async def ask_demo(payload: AskRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail='LLM key not configured')
    demo_ctx = """Family: Sharma family, Jaipur roots.
Members: Nani (b. 1948, grandmother), Papa, Maa, Riya (daughter), Aarav (6yo grandson).
Recorded stories include: "Our Diwali Morning" by Nani, "Holi at the old house" by Dadi, "Besan Ladoo, Nani's way" recipe by Nani."""
    system = ASK_AANGAN_SYSTEM_BASE + '\n\n' + demo_ctx
    chat = LlmChat(api_key=EMERGENT_LLM_KEY,
                   session_id=payload.session_id or str(uuid.uuid4()),
                   system_message=system).with_model('anthropic', 'claude-sonnet-4-5-20250929')
    chunks = []
    async for ev in chat.stream_message(UserMessage(text=payload.question)):
        if isinstance(ev, TextDelta):
            chunks.append(ev.content)
        elif isinstance(ev, StreamDone):
            break
    return {'answer': ''.join(chunks)}


# ============================================================================
# Waitlist (kept from MVP)
# ============================================================================
@api_router.post('/waitlist')
async def waitlist_create(payload: WaitlistCreate):
    existing = await db.waitlist.find_one({'email': payload.email}, {'_id': 0})
    if existing:
        return existing
    doc = payload.model_dump()
    doc['_id'] = str(uuid.uuid4())
    doc['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.waitlist.insert_one(doc)
    doc.pop('_id', None)
    return doc


@api_router.get('/waitlist')
async def waitlist_list():
    return await db.waitlist.find({}, {'_id': 0}).sort('created_at', -1).to_list(500)


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.on_event('startup')
async def on_startup():
    await db.users.create_index('email', unique=True)
    await db.members.create_index('family_id')
    await db.stories.create_index('family_id')
    await db.stories.create_index('member_id')
    await db.invites.create_index('family_id')


@app.on_event('shutdown')
async def on_shutdown():
    client.close()
