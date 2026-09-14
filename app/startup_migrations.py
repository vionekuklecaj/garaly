"""One-off, idempotent schema patches applied on every app startup (see
main.py's lifespan), for columns/data added after the original
create_all-based schema went live in production.

There's no Alembic set up in this project -- `Base.metadata.create_all`
(also run in the lifespan) only creates missing *tables*, it never alters
existing ones, so a new column on an existing table (Space, User) needs an
explicit ALTER TABLE. Every statement here is written to be safe to run
repeatedly (IF NOT EXISTS / idempotent UPDATE), so this can just stay in the
startup path indefinitely instead of needing a one-time migration run
against production by hand.
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

# Emails granted admin (moderation queue) access on every startup. There's
# no self-serve way to become an admin -- see User.is_admin in models.py.
ADMIN_EMAILS = ["vionekuklecaj@gmail.com"]

# IMPORTANT: `status DEFAULT 'approved'` here (not 'pending_review') is
# intentional and differs from the Space model's Python-side default.
# ADD COLUMN ... DEFAULT applies that default to every *existing* row the
# moment the column is created -- if that default were 'pending_review',
# every listing already live in production would instantly vanish from
# search behind the new moderation gate. Existing listings become
# 'approved' (unaffected); only brand-new listings, inserted through the
# ORM's Space(...) constructor after this deploys, get 'pending_review'
# from the model's own default and actually go through moderation.
_STATEMENTS = [
    "ALTER TABLE spaces ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20) DEFAULT ''",
    "ALTER TABLE spaces ADD COLUMN IF NOT EXISTS amenities VARCHAR(255) DEFAULT ''",
    "ALTER TABLE spaces ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'approved'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false",
]


async def run(conn: AsyncConnection) -> None:
    if conn.engine.dialect.name != "postgresql":
        # SQLite (local dev only) doesn't support "ADD COLUMN IF NOT
        # EXISTS", and dev DBs are disposable anyway -- create_all already
        # creates these columns correctly on a fresh SQLite file since
        # there's no pre-existing table to alter.
        return

    for stmt in _STATEMENTS:
        await conn.execute(text(stmt))

    if ADMIN_EMAILS:
        await conn.execute(
            text("UPDATE users SET is_admin = true WHERE email = ANY(:emails)"),
            {"emails": ADMIN_EMAILS},
        )
