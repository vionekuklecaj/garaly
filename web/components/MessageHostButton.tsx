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

  async function onClick() {
    if (!isLoggedIn) {
      window.location.href = loginHref;
      return;
    }
    setLoading(true);
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ space_id: spaceId }),
    });
    if (res.ok) {
      const conversation = await res.json();
      window.location.href = `/inbox?lang=${lang}&conversation=${conversation.id}`;
    } else {
      setLoading(false);
    }
  }

  return (
    <button type="button" className="btn-secondary" style={{ width: "100%" }} onClick={onClick} disabled={loading}>
      {t.messageHost}
    </button>
  );
}
