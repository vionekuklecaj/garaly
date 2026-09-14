"use client";

import { useState } from "react";
import type { Lang } from "@/lib/translations";

type Props = { lang: Lang; next: string };

export default function LoginForm({ lang, next }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      window.location.href = next + (next.includes("?") ? "&" : "?") + "lang=" + lang;
    } else {
      setSubmitting(false);
      const data = await res.json().catch(() => ({}));
      setError(data.detail || (lang === "de" ? "Anmeldung fehlgeschlagen." : "Login failed."));
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <div className="form-error visible">{error}</div>}
      <div className="field">
        <label>Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label>{lang === "de" ? "Passwort" : "Password"}</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button type="submit" className="btn-primary" disabled={submitting}>
        {lang === "de" ? "Anmelden" : "Login"}
      </button>
    </form>
  );
}
