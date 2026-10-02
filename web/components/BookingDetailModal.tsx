"use client";

import { useEffect } from "react";
import type { Lang, Translator } from "@/lib/translations";
import type { BookingDetail } from "@/lib/types";

type Props = {
  booking: BookingDetail;
  lang: Lang;
  t: Translator;
  showRenterInfo: boolean;
  onClose: () => void;
};

function bookingBadge(status: string, t: Translator): { label: string; cls: string } {
  if (status === "cancelled" || status === "declined") return { label: t.statusCancelledBadge, cls: "declined" };
  if (status === "confirmed" || status === "accepted") return { label: t.statusConfirmedBadge, cls: "accepted" };
  return { label: status, cls: "pending" };
}

function formatDateTime(lang: Lang, iso: string): string {
  return new Date(iso).toLocaleString(lang === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function BookingDetailModal({ booking, lang, t, showRenterInfo, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const badge = bookingBadge(booking.status, t);
  const hasHours = Boolean(booking.move_in_time && booking.move_out_time);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="hfont">{t.bookingDetailsTitle}</h2>
          <button type="button" className="modal-close" aria-label={t.close} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-row">
          <div className="title">
            {booking.space_title} · {booking.space_city}
          </div>
          <span className={`status-badge ${badge.cls}`}>{badge.label}</span>
        </div>

        <div className="modal-field">
          <span className="modal-label">{t.periodLabel}</span>
          <span>
            {booking.move_in_date} → {booking.move_out_date}
          </span>
        </div>

        {hasHours && (
          <div className="modal-field">
            <span className="modal-label">{t.timeLabel}</span>
            <span>
              {booking.move_in_time?.slice(0, 5)} – {booking.move_out_time?.slice(0, 5)}
            </span>
          </div>
        )}

        {showRenterInfo && booking.renter_name && (
          <div className="modal-field">
            <span className="modal-label">{t.renterLabel}</span>
            <span>
              {booking.renter_name} {booking.renter_email ? `(${booking.renter_email})` : ""}
            </span>
          </div>
        )}

        {booking.custom_period_note && (
          <div className="modal-field">
            <span className="modal-label">{t.noteLabel}</span>
            <span>{booking.custom_period_note}</span>
          </div>
        )}

        <div className="modal-field">
          <span className="modal-label">{t.statusLabel}</span>
          <span>{badge.label}</span>
        </div>

        <div className="modal-field">
          <span className="modal-label">{t.bookedOnLabel}</span>
          <span>{formatDateTime(lang, booking.created_at)}</span>
        </div>

        <a className="btn-secondary" style={{ display: "block", textAlign: "center", marginTop: 16 }} href={`/listing/${booking.space_id}?lang=${lang}`}>
          {t.viewFullListing}
        </a>
      </div>
    </div>
  );
}
