"use client";

import { useState } from "react";
import type { Translator } from "@/lib/translations";

type Props = { title: string; t: Translator };

export default function ShareButton({ title, t }: Props) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // user cancelled the native share sheet -- not an error
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access denied -- silently do nothing rather than crash
    }
  }

  return (
    <button className="btn-secondary" onClick={share}>
      {copied ? t.linkCopied : t.share}
    </button>
  );
}
