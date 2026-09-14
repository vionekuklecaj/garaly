"use client";

import { useState } from "react";
import type { Translator } from "@/lib/translations";

type Props = { bookingId: string; lang: string; t: Translator };

export default function ReviewForm({ bookingId, lang, t }: Props) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingId, rating, comment }),
    });
    if (res.ok) {
      setSubmitted(true);
    } else {
      setSubmitting(false);
      const data = await res.json().catch(() => ({}));
      setError(data.detail || (lang === "de" ? "Etwas ist schiefgelaufen." : "Something went wrong."));
    }
  }

  if (submitted) {
    return (
      <div className="request-card" style={{ marginBottom: 24 }}>
        <p style={{ color: "var(--green-deep)", fontWeight: 600 }}>{t.reviewSubmitted}</p>
      </div>
    );
  }

  return (
    <form className="request-card" style={{ marginBottom: 24 }} onSubmit={onSubmit}>
      <h3 className="hfont" style={{ marginBottom: 12 }}>
        {t.leaveReview}
      </h3>
      {error && <div className="form-error visible">{error}</div>}
      <div className="field">
        <label>{t.yourRating}</label>
        <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {"★".repeat(n)}
              {"☆".repeat(5 - n)}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>{t.yourComment}</label>
        <textarea
          rows={3}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid var(--border)",
            borderRadius: 10,
            fontFamily: "inherit",
            fontSize: 14,
          }}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      <button type="submit" className="btn-primary" disabled={submitting}>
        {t.submitReview}
      </button>
    </form>
  );
}
