# Aangan — Product Requirements (PRD)

## Original problem statement
Aangan is a private, AI-powered family culture and legacy platform. Initial scope was a premium
landing page; subsequent scope was expanded into a real working app where a family head signs up,
adds family members in any order, sees an auto-organising generation-based family tree, clicks any
member to read their story, and records voice notes in any Indian language that are transcribed
to text. Marketing site kept at `/`. Real app at `/app/*`.

## User personas
1. **Family head** — sign up, build the archive, invite the family.
2. **Family member** — joins via invite link, owns their own private details.
3. **Family viewer** — sees only what other members chose to make public.

## Stack
- Backend: FastAPI + MongoDB + JWT auth via httpOnly cookies + bcrypt.
- AI: Claude Sonnet 4.5 (text), OpenAI Whisper (speech-to-text), Gemini Nano Banana (imagery) —
  all via `EMERGENT_LLM_KEY` and `emergentintegrations`.
- Frontend: React (CRA), Tailwind, shadcn, sonner, lucide-react.

## What's implemented (Dec 2025)
### Backend (`/app/backend/server.py`)
- Auth: `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`,
  `GET /api/auth/me`, `POST /api/auth/invite`, `GET /api/auth/invite/{token}`,
  `POST /api/auth/accept-invite`. JWT in httpOnly cookie; bcrypt password hashing.
- Family + members: `GET /api/family`, `POST/GET/PATCH/DELETE /api/members[…]`. Privacy filtering
  via `member_view()` — head sees all; member-owners see their own private fields; everyone else
  sees only the fields each member listed in `public_fields`. Bidirectional relation cleanup on
  link/unlink/delete.
- Stories: `GET/POST /api/members/{id}/stories`, `PATCH/DELETE /api/stories/{id}`. Per-story
  `is_public` toggle; head sees all; member-owners see their own private stories.
- Whisper: `POST /api/transcribe` (multipart `file`, optional `language`) returns
  `{text, language, duration}`. Supports all Indian languages + English (auto-detect).
- Ask Aangan: `POST /api/ask/stream` (auth, SSE) answers from the user's actual family archive.
  `POST /api/ask-demo` (no auth) for the marketing demo.
- Waitlist (kept from MVP): `POST/GET /api/waitlist`.
- MongoDB indexes on startup: `users.email` (unique), `members.family_id`, `stories.family_id`,
  `stories.member_id`, `invites.family_id`.

### Frontend (`/app/frontend/src`)
- Marketing kept intact: `/`, `/how-it-works`, `/for-families`, `/privacy`, `/early-access`,
  `/archive/*` (six clickable mockup pages from the original MVP).
- Auth pages (no app chrome): `/app/signup`, `/app/login`, `/app/accept-invite/:token`.
- Real product (sidebar layout, gated by auth):
  - `/app` — My Aangan dashboard (member count, upcoming birthdays, recent members).
  - `/app/family` — generation-aware family tree (parents → you → children → grandchildren),
    spouse clusters with heart link; click any node to open the member.
  - `/app/family/new` — add a member with name, photo upload (data URL ≤ 2MB), relation, gender,
    DOB, place of birth, anniversary, profession, favourite food, languages (tag input), bio,
    notes, parents/spouse/children links, and per-field public-visibility checkboxes.
  - `/app/family/:id` — member detail with stats, relatives, personal notes (private), and a
    story list. Story composer supports text + in-browser voice recording (MediaRecorder WebM)
    → `/api/transcribe` (Whisper) → auto-fill content with detected-language label. Toggle a
    story public/private per-story; delete story; edit member.
  - `/app/family/:id/edit` — same form, edit mode (only owner + head).
  - `/app/invite` — head-only; generate a private one-shot invite link with WhatsApp / Email /
    Copy actions.
  - `/app/ask` — live Ask Aangan grounded in this family's actual members + stories.
  - `/app/settings` — account info + privacy explanation.
- `SiteNav` is auth-aware: signed-out shows "Sign in" + "Begin Your Archive" → /app/signup;
  signed-in shows "Open my Aangan" → /app.
- Generation-aware tree algorithm: BFS from family head; spouses share generation, children
  gen+1, parents gen-1. Grouped into rows labelled Grandparents / Parents & aunts-uncles /
  You and your generation / Children / Grandchildren.

### Imagery (marketing)
- All 12 marketing images AI-generated via Gemini Nano Banana with universal-Indian / pan-regional
  prompts (no sarees, sherwanis, turbans, bindis, tilak, regional jewellery, temple imagery,
  saffron-heavy colour, or festival decoration). Wardrobe palette: ivory, sage, beige.

## Privacy model
- Each member has `owner_user_id`, `public_fields[]`, and stories with `is_public`.
- The family head is a quiet super-viewer (sees everything).
- Other family members see: identity (name/photo/relation/DOB by default) + whatever each member
  added to their `public_fields`. Sensitive defaults are private (bio, notes, profession,
  favourite_food, languages, place_of_birth).
- Stories default to private; the author or head can flip the toggle.

## Test status
- iteration_1 (marketing only): 100% backend, 100% frontend.
- iteration_2 (real app): 100% backend (23/23 pytest), 100% frontend (13/13 flows). No critical
  bugs found.

## Backlog
- **P1** — Migrate `@app.on_event` → FastAPI `lifespan`; add MemberPatch model so PATCH enforces
  Literal validation; add `story_view()` to filter `created_by` for public stories from other
  authors; rate-limit `/api/ask/stream`; document CORS for true cross-origin deploys.
- **P2** — Real photo/audio object storage (currently inline data URLs in Mongo, fine for small
  scale, won't scale); Google Calendar import; PDF "legacy book" export of a tradition card or
  recipe; multi-language UI labels (Hindi, Tamil…); push notifications for upcoming birthdays;
  shared family events ("Diwali 2026, who's coming?"); 2FA for the family head.
