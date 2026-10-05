"use client";

import { useState } from "react";
import type { Lang, Translator } from "@/lib/translations";

type Props = {
  spaceId: string;
  renterId: string;
  lang: Lang;
  t: Translator;
};

// Host-side counterpart to MessageHostButton -- lets a host reach out to a
// renter who's actually booked their space, without waiting for the renter
// to message first. Backend only allows this once a real booking exists
// between them (see start_conversation's renter_id branch).
export default function MessageRenterButton({ spaceId, renterId, lang, t }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onClick() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ space_id: spaceId, renter_id: renterId }),
      });
      if (res.ok) {
        const conversation = await res.json();
        window.location.href = `/inbox?lang=${lang}&conversation=${conversation.id}`;
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.detail || (lang === "de" ? "Etwas ist schiefgelaufen." : "Something went wrong."));
    } catch {
      setError(lang === "de" ? "Etwas ist schiefgelaufen." : "Something went wrong.");
    }
    setLoading(false);
  }

  return (
    <div style={{ marginTop: 16 }}>
      <button type="button" className="btn-secondary" style={{ width: "100%" }} onClick={onClick} disabled={loading}>
        {t.messageRenter}
      </button>
      {error && (
        <div className="form-error visible" style={{ marginTop: 10, marginBottom: 0 }}>
          {error}
        </div>
      )}
    </div>
  );
}
