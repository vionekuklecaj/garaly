"use client";

import { useEffect, useState } from "react";
import type { Lang, Translator } from "@/lib/translations";
import type { BookingDetail } from "@/lib/types";

type Props = { lang: Lang; t: Translator };

function statusLabel(status: string, t: Props["t"]) {
  if (status === "accepted") return t.statusAccepted;
  if (status === "declined") return t.statusDeclined;
  return t.statusPending;
}

// Ported from the <script> block in app/templates/my_bookings.html.
export default function MyBookingsContent({ lang, t }: Props) {
  const [bookings, setBookings] = useState<BookingDetail[] | null>(null);

  useEffect(() => {
    fetch("/api/bookings/me")
      .then((res) => (res.ok ? res.json() : []))
      .then(setBookings);
  }, []);

  if (bookings === null) return <p style={{ color: "var(--ink-muted)" }}>…</p>;

  if (bookings.length === 0) {
    return (
      <div className="empty-state" style={{ padding: "32px 0" }}>
        <p>{t.noBookingsYet}</p>
        <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => (window.location.href = `/search?lang=${lang}`)}>
          {t.findASpace}
        </button>
      </div>
    );
  }

  return (
    <>
      {bookings.map((b) => (
        <a key={b.id} className="dash-listing-row" href={`/listing/${b.space_id}?lang=${lang}`} style={{ display: "flex" }}>
          <div className="thumb" />
          <div className="info">
            <div className="title">
              {b.space_title} · {b.space_city}
            </div>
            <div className="meta">
              {b.move_in_date} → {b.move_out_date}
            </div>
          </div>
          <span className={`status-badge ${b.status}`}>{statusLabel(b.status, t)}</span>
        </a>
      ))}
    </>
  );
}
