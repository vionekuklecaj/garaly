"use client";

import { useState } from "react";
import type { Lang, Translator } from "@/lib/translations";

type Props = {
  spaceId: string;
  lang: Lang;
  t: Translator;
  isLoggedIn: boolean;
  loginHref: string;
};

export default function MessageHostButton({ spaceId, lang, t, isLoggedIn, loginHref }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onClick() {
    if (!isLoggedIn) {
      window.location.href = loginHref;
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ space_id: spaceId }),
      });
      if (res.ok) {
        const conversation = await res.json();
        window.location.href = `/inbox?lang=${lang}&conversation=${conversation.id}`;
        return;
      }
      const data = await res.json().catch(() => ({}));
      // A raw "Not Found" with no other detail is Starlette's generic
      // unmatched-route 404 (i.e. the backend doesn't have this endpoint
      // deployed yet), not one of our own app-level 404s (which always
      // carry a specific detail, e.g. "Space not found") -- showing that
      // bare phrase to a user reads as confusing/meaningless, so fall
      // back to the same friendly message as a network failure instead.
      const detail = res.status === 404 && data.detail === "Not Found" ? null : data.detail;
      setError(detail || (lang === "de" ? "Etwas ist schiefgelaufen." : "Something went wrong."));
    } catch {
      setError(lang === "de" ? "Etwas ist schiefgelaufen." : "Something went wrong.");
    }
    setLoading(false);
  }

  return (
    <>
      <button type="button" className="btn-secondary" style={{ width: "100%" }} onClick={onClick} disabled={loading}>
        {t.messageHost}
      </button>
      {error && (
        <div className="form-error visible" style={{ marginTop: 10, marginBottom: 0 }}>
          {error}
        </div>
      )}
    </>
  );
}
