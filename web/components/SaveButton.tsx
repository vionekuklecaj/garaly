"use client";

import { useEffect, useState } from "react";
import type { Translator } from "@/lib/translations";

type Props = {
  spaceId: string;
  isLoggedIn: boolean;
  t: Translator;
  loginHref: string;
};

export default function SaveButton({ spaceId, isLoggedIn, t, loginHref }: Props) {
  const [saved, setSaved] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      setSaved(false);
      return;
    }
    fetch("/api/saved")
      .then((r) => (r.ok ? r.json() : []))
      .then((items: { id: string }[]) => setSaved(items.some((s) => s.id === spaceId)));
  }, [isLoggedIn, spaceId]);

  async function toggle() {
    if (!isLoggedIn) {
      window.location.href = loginHref;
      return;
    }
    const next = !saved;
    setSaved(next); // optimistic
    const res = await fetch(`/api/spaces/${spaceId}/save`, { method: next ? "POST" : "DELETE" });
    if (!res.ok) setSaved(!next); // revert on failure
  }

  return (
    <button className="btn-secondary" onClick={toggle}>
      {saved ? `♥ ${t.save}` : `♡ ${t.save}`}
    </button>
  );
}
