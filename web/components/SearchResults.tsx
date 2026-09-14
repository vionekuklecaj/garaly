"use client";

import { useEffect, useState } from "react";
import { CATEGORIES, type Lang, type Translator } from "@/lib/translations";
import type { Space, SpaceListResponse } from "@/lib/types";

type Props = {
  lang: Lang;
  t: Translator;
  city: string;
  activeCategory: string;
  moveIn: string;
  moveOut: string;
  radius: string;
};

// Ported from the inline <script> in app/templates/search.html: chip-row
// category filter + the listing grid it filters, fetching from the same
// /api/spaces endpoint (proxied through to FastAPI).
export default function SearchResults({ lang, t, city, activeCategory, moveIn, moveOut, radius }: Props) {
  const [category, setCategory] = useState(activeCategory || "all");
  const [items, setItems] = useState<Space[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({ page_size: "24" });
    if (city) params.set("city", city);
    if (category && category !== "all") params.set("category", category);
    if (radius) params.set("radius_km", radius);
    // move_in/move_out aren't applied to search filtering yet (see the
    // backend note in app/routers/spaces.py) -- they're only carried
    // through to prefill the booking form on the listing detail page.

    fetch("/api/spaces?" + params.toString())
      .then((res) => res.json())
      .then((data: SpaceListResponse) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [city, category, radius]);

  function onChipClick(key: string) {
    setCategory(key);
    const select = document.querySelector<HTMLSelectElement>('select[name="category"]');
    if (select) select.value = key;
  }

  function listingHref(space: Space) {
    const params = new URLSearchParams({ lang });
    if (moveIn) params.set("move_in", moveIn);
    if (moveOut) params.set("move_out", moveOut);
    return `/listing/${space.id}?${params.toString()}`;
  }

  const catLabel = (key: string) => CATEGORIES.find((c) => c.key === key)?.[lang] || key;

  return (
    <>
      <div className="chip-row">
        <div className={`chip${category === "all" ? " active" : ""}`} onClick={() => onChipClick("all")}>
          {t.filterAll}
        </div>
        {CATEGORIES.map((c) => (
          <div key={c.key} className={`chip${category === c.key ? " active" : ""}`} onClick={() => onChipClick(c.key)}>
            {c.icon} {c[lang]}
          </div>
        ))}
      </div>

      <div className="results-row">
        <span>{total !== null ? `${total} ${t.resultsCount}` : t.resultsCount}</span>
        <span>{t.sortBy}</span>
      </div>

      {!loading && items.length === 0 ? (
        <div className="empty-state">
          <p>0 {t.resultsCount}</p>
        </div>
      ) : (
        <div className="listing-grid">
          {items.map((space) => (
            <div key={space.id} className="listing-card" onClick={() => (window.location.href = listingHref(space))}>
              <div className="photo-wrap">
                <div className="photo">{space.category.toUpperCase()} PHOTO</div>
                <div className="badge-category">{catLabel(space.category)}</div>
                <div className="badge-save" onClick={(e) => e.stopPropagation()}>
                  ♡
                </div>
              </div>
              <div className="body">
                <div className="title">{space.title}</div>
                <div className="loc">{space.city}</div>
                <div className="price-row">
                  <div className="price">
                    {Number(space.price_month).toFixed(0)} €{" "}
                    <span style={{ fontWeight: 400, color: "var(--ink-muted)" }}>/ {t.perMonth}</span>
                  </div>
                  <div className="rating">★ 4.8</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
