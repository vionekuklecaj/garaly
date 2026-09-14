"""Small fixed catalogs shared across schemas/routers. Kept separate from
models.py/schemas.py so both can import it without a circular import."""

# Matches the amenity_* translation keys in app/translations.py (and their
# mirror in web/lib/translations.ts) -- these are the only amenities the UI
# knows how to render, so it's also the only valid set for Space.amenities.
AMENITY_KEYS = {"lighting", "electricity", "security", "access", "dry", "parking"}
