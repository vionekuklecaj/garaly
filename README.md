# Garaly — MVP

An Airbnb-style marketplace for unused space (garages, storage, parking, halls,
cellars, outdoor areas), built with FastAPI + PostgreSQL. Recreates the design
from Claude Design (`Garaly.dc.html`) as real, server-rendered pages, with a
DE/EN language toggle and a working auth + listings + bookings backend.

## Stack

- **Backend**: FastAPI (async), SQLAlchemy 2.0 (async), PostgreSQL
- **Frontend**: Server-rendered Jinja2 templates + vanilla JS (no build step,
  no separate frontend deploy — simplest thing that could work for an MVP)
- **Auth**: Session cookies (httpOnly, secure in prod), backed by a `sessions`
  table in Postgres — not in-memory, so it survives restarts and works if you
  run more than one backend process behind a load balancer

## Project layout

```
app/
  main.py           FastAPI app, middleware, router wiring
  config.py         Settings loaded from environment / .env
  database.py       Async engine + session factory
  models.py         User, Space, Booking, Session (SQLAlchemy models)
  schemas.py        Pydantic request/response models
  auth.py           Password hashing, session create/verify, get_current_user
  translations.py   DE/EN copy dictionary + category list
  routers/
    pages.py        HTML page routes (landing, search, detail, login, register)
    auth_routes.py  /api/auth/* (register, login, logout, me)
    spaces.py       /api/spaces (search/filter/paginate, create)
    bookings.py     /api/bookings (create, list mine)
  templates/        Jinja2 templates matching the Claude Design layout
  static/           CSS, JS, logo asset
seed.py             Populates demo host + 10 listings for local dev
requirements.txt
.env.example
```

## Local setup

1. **Postgres**: have a Postgres instance running (locally via Docker is
   easiest):
   ```bash
   docker run --name garaly-db -e POSTGRES_USER=garaly -e POSTGRES_PASSWORD=garaly \
     -e POSTGRES_DB=garaly -p 5432:5432 -d postgres:16
   ```

2. **Python environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate        # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Environment variables**:
   ```bash
   cp .env.example .env
   # edit .env if your Postgres isn't on localhost:5432 with the default creds
   ```

4. **Run it**:
   ```bash
   uvicorn app.main:app --reload
   ```
   Tables are created automatically on startup for this MVP stage (see
   "Moving past the MVP" below for when to switch to real migrations).

5. **(Optional) seed demo data**:
   ```bash
   python seed.py
   ```
   Creates a demo host (`host@garaly.test` / `password123`) and 10 listings
   across German cities, so the search/landing pages aren't empty.

6. Visit `http://localhost:8000`.

## What's implemented (MVP scope)

- Register / login / logout with hashed passwords and session cookies
- Landing, search (with city + category filtering, paginated), and listing
  detail pages, matching the design's colors/type/spacing
- DE/EN toggle (cookie + query-param based; reloads the page — simpler and
  more robust than a client-side SPA swap for an MVP, and better for
  bookmarking/back-button/SEO)
- Create a listing, browse/filter listings, send a booking request
- `/health` endpoint for load balancer checks

## What's intentionally left out of the MVP

These are the natural next slice, not required to launch something real:

- **Photo uploads** — listings currently show placeholder photo blocks, same
  as the design prototype. Add S3/R2 + an upload endpoint when ready.
- **Payments** — "Send request" creates a `Booking` row with `status=pending`;
  there's no charge flow yet. Stripe Connect is the natural fit for a
  marketplace like this (host payouts, platform fee).
- **Host accepting/declining requests** — bookings sit at `pending`; add an
  endpoint + simple dashboard for hosts to accept/decline.
- **Email verification / password reset** — `User.is_verified` exists but
  isn't wired to anything yet.
- **Rate limiting** on login/register — matters once this is public, to blunt
  credential-stuffing and spam signups. `slowapi` is a low-effort add.

## Scaling notes (why this shouldn't fall over under load)

- Sessions live in Postgres, not in a Python dict — so you can run N backend
  processes behind a load balancer and logins still work correctly.
- Listing search is **paginated** (`page`/`page_size`) and filtered at the
  SQL level with indexes on `city` and `category` — it won't slow down
  linearly as listings grow into the thousands.
- SQLAlchemy connection pooling (`pool_size`/`max_overflow`/`pool_pre_ping`)
  avoids exhausting Postgres connections and avoids using dead connections
  after a DB restart or network blip.
- Gzip compression on responses.
- The frontend is plain server-rendered HTML/CSS/JS — no separate frontend
  build/deploy to keep in sync, and it's naturally cacheable by a CDN later
  (the static assets already live under `/static`).

**When you outgrow this:**
- If session-lookup latency becomes a bottleneck: move the `sessions` table
  to Redis. `auth.py` is the only file that would need to change.
- If Postgres itself becomes the bottleneck: read replicas, or a connection
  pooler like PgBouncer in front of it.
- If you need real-time updates (e.g. "someone just booked this"): add a
  WebSocket or SSE endpoint; nothing here blocks that.

## Moving past the MVP

- Replace `Base.metadata.create_all` (in `main.py`'s lifespan) with **Alembic
  migrations** as soon as you have real user data you can't afford to lose to
  a schema change. `pip install alembic`, `alembic init alembic`, point
  `alembic.ini` / `env.py` at `DATABASE_URL_SYNC` from `.env`.
- Set `COOKIE_SECURE=true` once you're serving over HTTPS (required for the
  cookie to actually be sent).
- Generate a real `SECRET_KEY` for production (not currently used for signing
  anything yet, but reserved for CSRF tokens / future JWT use if you add
  those).

## Deployment

Works the same on any platform that runs a Python process + gives you a
Postgres instance: Railway, Render, Fly.io, a plain VPS with systemd, etc.
Typical start command:
```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 4
```
`--workers 4` runs multiple processes — this is exactly the case the
Postgres-backed session design was built for; an in-memory session store
would silently break here (users randomly logged out depending on which
worker handled their request).
