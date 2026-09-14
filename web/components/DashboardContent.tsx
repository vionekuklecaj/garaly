"use client";

import { useEffect, useState } from "react";
import type { Lang, Translator } from "@/lib/translations";
import type { BookingDetail, Space } from "@/lib/types";

type Props = {
  lang: Lang;
  t: Translator;
};

function statusLabel(status: string, t: Props["t"]) {
  if (status === "accepted") return t.statusAccepted;
  if (status === "declined") return t.statusDeclined;
  return t.statusPending;
}

// Ported from the <script> block in app/templates/dashboard.html.
export default function DashboardContent({ lang, t }: Props) {
  const [listings, setListings] = useState<Space[] | null>(null);
  const [requests, setRequests] = useState<BookingDetail[] | null>(null);

  async function loadListings() {
    const res = await fetch("/api/spaces/mine");
    setListings(res.ok ? await res.json() : []);
  }

  async function loadRequests() {
    const res = await fetch("/api/bookings/received");
    setRequests(res.ok ? await res.json() : []);
  }

  useEffect(() => {
    loadListings();
    loadRequests();
  }, []);

  async function updateBooking(bookingId: string, status: "accepted" | "declined") {
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      loadRequests();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.detail || (lang === "de" ? "Etwas ist schiefgelaufen." : "Something went wrong."));
    }
  }

  return (
    <>
      <div className="dash-section">
        <h2 className="hfont">{t.dashboardTitle}</h2>
        {listings === null ? (
          <p style={{ color: "var(--ink-muted)" }}>…</p>
        ) : listings.length === 0 ? (
          <div className="empty-state" style={{ padding: "32px 0" }}>
            <p>{t.noListingsYet}</p>
            <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => (window.location.href = `/list-space?lang=${lang}`)}>
              {t.addListing}
            </button>
          </div>
        ) : (
          listings.map((s) => (
            <a key={s.id} className="dash-listing-row" href={`/listing/${s.id}?lang=${lang}`} style={{ display: "flex" }}>
              <div className="thumb" />
              <div className="info">
                <div className="title">{s.title}</div>
                <div className="meta">
                  {s.city} · {Number(s.price_month).toFixed(0)} € / {t.perMonth}
                </div>
              </div>
              {!s.is_active && <span className="status-badge declined">inactive</span>}
            </a>
          ))
        )}
      </div>

      <div className="dash-section">
        <h2 className="hfont">{t.incomingRequests}</h2>
        {requests === null ? (
          <p style={{ color: "var(--ink-muted)" }}>…</p>
        ) : requests.length === 0 ? (
          <div className="empty-state" style={{ padding: "32px 0" }}>
            <p>{t.noRequestsYet}</p>
          </div>
        ) : (
          requests.map((b) => (
            <div key={b.id} className="request-card">
              <div className="row1">
                <div>
                  <div className="title">
                    {b.space_title} · {b.space_city}
                  </div>
                  <div className="meta">
                    {b.renter_name} ({b.renter_email})
                  </div>
                  <div className="meta">
                    {b.move_in_date} → {b.move_out_date}
                  </div>
                </div>
                <span className={`status-badge ${b.status}`}>{statusLabel(b.status, t)}</span>
              </div>
              {b.custom_period_note && <div className="note">{b.custom_period_note}</div>}
              {b.status === "pending" && (
                <div className="actions">
                  <button className="btn-decline" onClick={() => updateBooking(b.id, "declined")}>
                    {t.decline}
                  </button>
                  <button className="btn-accept" onClick={() => updateBooking(b.id, "accepted")}>
                    {t.accept}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
