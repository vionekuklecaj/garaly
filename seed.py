"""Populate the database with demo users and listings for local development.

Run with: python seed.py
"""
import asyncio

from app.auth import hash_password
from app.database import AsyncSessionLocal, Base, engine
from app.models import Space, User

DEMO_SPACES = [
    ("Doppelgarage in Schwabing", "garages", "München", "Leopoldstraße 45, München", 120, 18),
    ("Trockener Lagerraum Zentrum", "storage", "Berlin", "Alexanderplatz 3, Berlin", 65, 8),
    ("Stellplatz nahe Hauptbahnhof", "parking", "Frankfurt", "Poststraße 12, Frankfurt", 45, 12),
    ("Helle Lagerhalle am Stadtrand", "halls", "Hamburg", "Industriestraße 8, Hamburg", 340, 120),
    ("Kellerabteil, trocken & sicher", "storage", "Köln", "Ringstraße 20, Köln", 35, 6),
    ("Umzäunte Außenfläche", "outdoor", "Stuttgart", "Am Feld 5, Stuttgart", 80, 40),
    ("Einzelgarage ruhige Lage", "garages", "München", "Sendlinger Straße 30, München", 95, 15),
    ("Lagerraum mit Regalsystem", "storage", "München", "Dachauer Straße 88, München", 70, 10),
    ("Tiefgaragenstellplatz", "parking", "Berlin", "Friedrichstraße 100, Berlin", 55, 12),
    ("Lagerhalle mit Rampe", "halls", "Leipzig", "Gewerbering 15, Leipzig", 410, 150),
]


async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        existing = await db.get(User, "demo-host")
        if existing is None:
            host = User(
                id="demo-host",
                email="host@garaly.test",
                password_hash=hash_password("password123"),
                name="Anna Schmidt",
                is_verified=True,
            )
            db.add(host)
            await db.flush()

            for title, category, city, address, price, size in DEMO_SPACES:
                db.add(
                    Space(
                        owner_id=host.id,
                        title=title,
                        description="",
                        category=category,
                        city=city,
                        address=address,
                        price_month=price,
                        size_sqm=size,
                    )
                )
            await db.commit()
            print("Seeded demo user (host@garaly.test / password123) and 10 listings.")
        else:
            print("Demo data already present, skipping.")


if __name__ == "__main__":
    asyncio.run(main())
