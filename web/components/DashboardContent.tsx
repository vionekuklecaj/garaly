"use client";

import { useEffect, useState } from "react";
import type { Lang, Translator } from "@/lib/translations";
import type { BookingDetail, Space } from "@/lib/types";

type Props = { lang: Lang; t: Translator };

type Tab = "listings" | "bookings" | "saved" | "stats";

function statusBadge(space: Space, t: Translator): { label: string; cls: string } {
  if (!space.is_active) return { label: t.statPaused, cls: "declined" };
  if (space.status === "pending_review") return { label: t.statusPendingReview, cls: "pending" };
  if (space.status === "rejected") return { label: t.statusRejected, cls: "declined" };
  return { label: t.statusApproved, cls: "accepted" };
}

function bookingBadge(status: string, t: Translator): { label: string; cls: string } {
  if (status === "cancelled" || status === "declined") return { label: t.statusCancelledBadge, cls: "declined" };
  if (status === "confirmed" || status === "accepted") return { label: t.statusConfirmedBadge, cls: "accepted" };
  return { label: status, cls: "pending" };
}

// Ported/consolidated from app/templates/dashboard.html + my_bookings.html,
// restructured into tabs (Listings / Bookings / Saved / Stats) per the
// Phase 3 dashboard redesign -- "My requests" is no longer a separate
// header link, everything lives here now.
export default function DashboardContent({ lang, t }: Props) {
  const [tab, setTab] = useState<Tab>("listings");
  const [listings, setListings] = useState<Space[] | null>(null);
  const [myBookings, setMyBookings] = useState<BookingDetail[] | null>(null);
  const [received, setReceived] = useState<BookingDetail[] | null>(null);
  const [saved, setSaved] = useState<Space[] | null>(null);

  async function loadAll() {
    const [l, mb, rb, sv] = await Promise.all([
      fetch("/api/spaces/mine").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/bookings/me").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/bookings/received").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/saved").then((r) => (r.ok ? r.json() : [])),
    ]);
    setListings(l);
    setMyBookings(mb);
    setReceived(rb);
    setSaved(sv);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function cancelBooking(id: string) {
    if (!confirm(t.cancelConfirm)) return;
    const res = await fetch(`/api/bookings/${id}/cancel`, { method: "PATCH" });
    if (res.ok) {
      const mb = await fetch("/api/bookings/me").then((r) => r.json());
      setMyBookings(mb);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.detail || (lang === "de" ? "Etwas ist schiefgelaufen." : "Something went wrong."));
    }
  }

  async function unsave(spaceId: string) {
    await fetch(`/api/spaces/${spaceId}/save`, { method: "DELETE" });
    setSaved((prev) => (prev ? prev.filter((s) => s.id !== spaceId) : prev));
  }

  const priceById = new Map((listings || []).map((s) => [s.id, s.price_month]));
  const now = new Date();
  const activeListings = (listings || []).filter((s) => s.is_active && s.status === "approved").length;
  const upcomingBookings = (received || []).filter(
    (b) => (b.status === "confirmed" || b.status === "accepted") && new Date(b.move_in_date) >= now
  ).length;
  const revenueMonth = (received || [])
    .filter((b) => {
      if (b.status !== "confirmed" && b.status !== "accepted") return false;
      const start = new Date(b.move_in_date);
      const end = new Date(b.move_out_date);
      return start <= now && end >= new Date(now.getFullYear(), now.getMonth(), 1);
    })
    .reduce((sum, b) => sum + (priceById.get(b.space_id) || 0), 0);

  return (
    <>
      <div className="chip-row" style={{ marginTop: 0 }}>
        <div className={`chip${tab === "listings" ? " active" : ""}`} onClick={() => setTab("listings")}>
          {t.dashboardTabListings}
        </div>
        <div className={`chip${tab === "bookings" ? " active" : ""}`} onClick={() => setTab("bookings")}>
          {t.dashboardTabBookings}
        </div>
        <div className={`chip${tab === "saved" ? " active" : ""}`} onClick={() => setTab("saved")}>
          {t.dashboardTabSaved}
        </div>
        <div className={`chip${tab === "stats" ? " active" : ""}`} onClick={() => setTab("stats")}>
          {t.dashboardTabStats}
        </div>
      </div>

      {tab === "listings" && (
        <div className="dash-section">
          {listings === null ? (
            <p style={{ color: "var(--ink-muted)" }}>…</p>
          ) : listings.length === 0 ? (
            <div className="empty-state" style={{ padding: "32px 0" }}>
              <p>{t.noListingsYet}</p>
              <button
                className="btn-primary"
                style={{ marginTop: 12 }}
                onClick={() => (window.location.href = `/list-space?lang=${lang}`)}
              >
                {t.addListing}
              </button>
            </div>
          ) : (
            listings.map((s) => {
              const badge = statusBadge(s, t);
              return (
                <div key={s.id} className="dash-listing-row" style={{ display: "flex" }}>
                  <a href={`/listing/${s.id}?lang=${lang}`} style={{ display: "flex", flex: 1, minWidth: 0 }}>
                    <div className="thumb" />
                    <div className="info">
                      <div className="title">{s.title}</div>
                      <div className="meta">
                        {s.city} · {Number(s.price_month).toFixed(0)} € / {t.perMonth}
                      </div>
                    </div>
                  </a>
                  <span className={`status-badge ${badge.cls}`} style={{ marginRight: 12 }}>
                    {badge.label}
                  </span>
                  <a href={`/manage-listing/${s.id}?lang=${lang}`} className="btn-secondary" style={{ flex: "none" }}>
                    {t.editListing}
                  </a>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "bookings" && (
        <>
          <div className="dash-section">
            <h2 className="hfont">{t.dashboardTabBookings}</h2>
            {myBookings === null ? (
              <p style={{ color: "var(--ink-muted)" }}>…</p>
            ) : myBookings.length === 0 ? (
              <div className="empty-state" style={{ padding: "32px 0" }}>
                <p>{t.noBookingsYet}</p>
                <button
                  className="btn-primary"
                  style={{ marginTop: 12 }}
                  onClick={() => (window.location.href = `/search?lang=${lang}`)}
                >
                  {t.findASpace}
                </button>
              </div>
            ) : (
              myBookings.map((b) => {
                const badge = bookingBadge(b.status, t);
                const canCancel = (b.status === "confirmed" || b.status === "accepted") && !b.is_past;
                return (
                  <div key={b.id} className="request-card">
                    <div className="row1">
                      <div>
                        <div className="title">
                          {b.space_title} · {b.space_city}
                        </div>
                        <div className="meta">
                          {b.move_in_date} → {b.move_out_date}
                        </div>
                      </div>
                      <span className={`status-badge ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <div className="actions">
                      {canCancel && (
                        <button className="btn-decline" onClick={() => cancelBooking(b.id)}>
                          {t.cancelReservation}
                        </button>
                      )}
                      {b.can_review && (
                        <a className="btn-accept" href={`/listing/${b.space_id}?lang=${lang}&review=${b.id}`}>
                          {t.leaveReview}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="dash-section">
            <h2 className="hfont">{t.incomingRequests}</h2>
            {received === null ? (
              <p style={{ color: "var(--ink-muted)" }}>…</p>
            ) : received.length === 0 ? (
              <div className="empty-state" style={{ padding: "32px 0" }}>
                <p>{t.noRequestsYet}</p>
              </div>
            ) : (
              received.map((b) => {
                const badge = bookingBadge(b.status, t);
                return (
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
                      <span className={`status-badge ${badge.cls}`}>{badge.label}</span>
                    </div>
                    {b.custom_period_note && <div className="note">{b.custom_period_note}</div>}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {tab === "saved" && (
        <div className="dash-section">
          {saved === null ? (
            <p style={{ color: "var(--ink-muted)" }}>…</p>
          ) : saved.length === 0 ? (
            <div className="empty-state" style={{ padding: "32px 0" }}>
              <p>{t.noSavedYet}</p>
            </div>
          ) : (
            saved.map((s) => (
              <div key={s.id} className="dash-listing-row" style={{ display: "flex" }}>
                <a href={`/listing/${s.id}?lang=${lang}`} style={{ display: "flex", flex: 1, minWidth: 0 }}>
                  <div className="thumb" />
                  <div className="info">
                    <div className="title">{s.title}</div>
                    <div className="meta">
                      {s.city} · {Number(s.price_month).toFixed(0)} € / {t.perMonth}
                    </div>
                  </div>
                </a>
                <button className="btn-secondary" onClick={() => unsave(s.id)}>
                  {t.remove}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "stats" && (
        <div className="dash-section">
          <div className="stat-tiles">
            <div className="stat-tile">
              <div className="value hfont">{listings === null ? "…" : activeListings}</div>
              <div className="label">{t.statActiveListings}</div>
            </div>
            <div className="stat-tile">
              <div className="value hfont">{received === null ? "…" : upcomingBookings}</div>
              <div className="label">{t.statUpcomingBookings}</div>
            </div>
            <div className="stat-tile">
              <div className="value hfont">{received === null ? "…" : `${revenueMonth.toFixed(0)} €`}</div>
              <div className="label">{t.statRevenueMonth}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
