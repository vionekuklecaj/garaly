"use client";

import { useState } from "react";
import type { Lang, Translator } from "@/lib/translations";
import type { User } from "@/lib/types";

type Props = { lang: Lang; t: Translator; user: User };

export default function AccountForm({ lang, t, user: initial }: Props) {
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const changingSensitive = email !== initial.email || newPassword.length > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSubmitting(true);

    const body: Record<string, string> = {};
    if (name !== initial.name) body.name = name;
    if (email !== initial.email) body.email = email;
    if (newPassword) body.new_password = newPassword;
    if (changingSensitive) body.current_password = currentPassword;

    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSubmitting(false);
    if (res.ok) {
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
    } else {
      const data = await res.json().catch(() => ({}));
      const detail = Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail;
      setError(detail || (lang === "de" ? "Etwas ist schiefgelaufen." : "Something went wrong."));
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 420 }}>
      {error && <div className="form-error visible">{error}</div>}
      {success && (
        <div style={{ background: "var(--green-soft)", color: "var(--green-deep)", borderRadius: 10, padding: "10px 14px", fontSize: 13.5, marginBottom: 16 }}>
          {t.accountUpdated}
        </div>
      )}

      <div className="field">
        <label>Name</label>
        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label>{t.newPasswordOptional}</label>
        <input type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
      </div>
      {changingSensitive && (
        <div className="field">
          <label>{t.currentPassword}</label>
          <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          <div style={{ fontSize: 12.5, color: "var(--ink-muted)", marginTop: 4 }}>{t.currentPasswordHint}</div>
        </div>
      )}

      <button type="submit" className="btn-primary" disabled={submitting}>
        {t.saveChanges}
      </button>
    </form>
  );
}
