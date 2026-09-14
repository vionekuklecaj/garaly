"use client";

import { useState } from "react";
import type { Lang } from "@/lib/translations";

type Props = { lang: Lang };

export default function RegisterForm({ lang }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (res.ok) {
      window.location.href = "/?lang=" + lang;
    } else {
      setSubmitting(false);
      const data = await res.json().catch(() => ({}));
      setError(data.detail || (lang === "de" ? "Registrierung fehlgeschlagen." : "Registration failed."));
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <div className="form-error visible">{error}</div>}
      <div className="field">
        <label>Name</label>
        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label>
          {lang === "de" ? "Passwort" : "Password"}{" "}
          <span style={{ fontWeight: 400, color: "var(--ink-muted)" }}>
            ({lang === "de" ? "mind. 8 Zeichen" : "min 8 characters"})
          </span>
        </label>
        <input type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button type="submit" className="btn-primary" disabled={submitting}>
        {lang === "de" ? "Konto erstellen" : "Create account"}
      </button>
    </form>
  );
}
