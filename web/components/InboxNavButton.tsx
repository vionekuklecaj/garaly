"use client";

import { useEffect, useState } from "react";
import type { Lang, Translator } from "@/lib/translations";

type Props = { lang: Lang; t: Translator };

const POLL_MS = 20000;

export default function InboxNavButton({ lang, t }: Props) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/conversations/unread-count");
        if (!cancelled && res.ok) {
          const data = await res.json();
          setCount(data.count);
        }
      } catch {
        // Ignore -- next poll will retry, no need to surface a transient
        // network error for a background badge count.
      }
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <a className="inbox-nav-btn" href={`/inbox?lang=${lang}`} aria-label={t.navInbox}>
      💬
      {count > 0 && <span className="inbox-nav-badge">{count > 9 ? "9+" : count}</span>}
    </a>
  );
}
