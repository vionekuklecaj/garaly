"use client";

import { useEffect, useRef, useState } from "react";
import type { Lang, Translator } from "@/lib/translations";
import type { User } from "@/lib/types";

type Props = { lang: Lang; user: User; t: Translator };

// Replaces the old plain "logout" text link: dashboard/admin/account/logout
// all live behind one avatar button instead of separate items competing
// for space in the header.
export default function ProfileMenu({ lang, user, t }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/?lang=" + lang;
  }

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t.myAccount}
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "var(--green-soft)",
          color: "var(--green-deep)",
          border: "1px solid var(--border)",
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {user.name[0]?.toUpperCase() || "?"}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
            boxShadow: "var(--shadow-search)",
            minWidth: 200,
            padding: 8,
            zIndex: 60,
          }}
        >
          <div style={{ padding: "8px 12px", marginBottom: 4, borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{user.name}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-muted)" }}>{user.email}</div>
          </div>
          <ProfileMenuLink href={`/dashboard?lang=${lang}`}>{t.navDashboard}</ProfileMenuLink>
          {user.is_admin && <ProfileMenuLink href={`/admin?lang=${lang}`}>{t.navAdmin}</ProfileMenuLink>}
          <ProfileMenuLink href={`/account?lang=${lang}`}>{t.myAccount}</ProfileMenuLink>
          <button
            onClick={logout}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "8px 12px",
              borderRadius: 8,
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 14,
              fontFamily: "inherit",
              color: "#b3261e",
            }}
          >
            {t.logout}
          </button>
        </div>
      )}
    </div>
  );
}

function ProfileMenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      style={{
        display: "block",
        padding: "8px 12px",
        borderRadius: 8,
        fontSize: 14,
      }}
    >
      {children}
    </a>
  );
}
