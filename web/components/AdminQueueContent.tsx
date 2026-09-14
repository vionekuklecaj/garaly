"use client";

import { useEffect, useState } from "react";
import type { Lang, Translator } from "@/lib/translations";
import type { AdminSpace } from "@/lib/types";

type Props = { lang: Lang; t: Translator };

// Powers /admin -- the moderation queue. Mirrors what get_current_admin on
// the backend already enforces (404s the whole page for non-admins before
// this even renders, see app/admin/page.tsx).
export default function AdminQueueContent({ lang, t }: Props) {
  const [items, setItems] = useState<AdminSpace[] | null>(null);

  async function load() {
    const res = await fetch("/api/admin/spaces?status=pending_review");
    setItems(res.ok ? await res.json() : []);
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(id: string, decision: "approved" | "rejected") {
    const res = await fetch(`/api/admin/spaces/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: decision }),
    });
    if (res.ok) {
      setItems((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
    } else {
      alert(lang === "de" ? "Etwas ist schiefgelaufen." : "Something went wrong.");
    }
  }

  if (items === null) return <p style={{ color: "var(--ink-muted)" }}>…</p>;

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <p>{t.noQueueItems}</p>
      </div>
    );
  }

  return (
    <>
      {items.map((s) => (
        <div key={s.id} className="request-card">
          <div className="row1">
            <div>
              <div className="title">
                <a href={`/listing/${s.id}?lang=${lang}`}>{s.title}</a> · {s.city}
              </div>
              <div className="meta">
                {s.owner_name} ({s.owner_email})
              </div>
              <div className="meta">
                {s.category} · {Number(s.price_month).toFixed(0)} € / {t.perMonth}
              </div>
            </div>
            <span className="status-badge pending">{t.statusPendingReview}</span>
          </div>
          {s.description && <div className="note">{s.description}</div>}
          <div className="actions">
            <button className="btn-decline" onClick={() => decide(s.id, "rejected")}>
              {t.reject}
            </button>
            <button className="btn-accept" onClick={() => decide(s.id, "approved")}>
              {t.approve}
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
