"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORIES, type Lang, type Translator } from "@/lib/translations";
import type { AmenityKey, Booking, Space, SpaceImage } from "@/lib/types";
import AmenitiesPicker from "./AmenitiesPicker";

type Props = { lang: Lang; t: Translator; space: Space };

export default function ManageListingForm({ lang, t, space: initial }: Props) {
  const [space, setSpace] = useState(initial);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [category, setCategory] = useState(initial.category);
  const [city, setCity] = useState(initial.city);
  const [address, setAddress] = useState(initial.address);
  const [zipCode, setZipCode] = useState(initial.zip_code);
  const [amenities, setAmenities] = useState<AmenityKey[]>(initial.amenities as AmenityKey[]);
  const [priceMonth, setPriceMonth] = useState(String(initial.price_month));
  const [sizeSqm, setSizeSqm] = useState(initial.size_sqm ? String(initial.size_sqm) : "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [images, setImages] = useState<SpaceImage[]>(initial.images || []);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [blocks, setBlocks] = useState<Booking[] | null>(null);
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockNote, setBlockNote] = useState("");

  useEffect(() => {
    fetch(`/api/spaces/${space.id}/block-dates`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setBlocks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);

    const res = await fetch(`/api/spaces/${space.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        category,
        city,
        address,
        zip_code: zipCode,
        amenities,
        price_month: parseFloat(priceMonth),
        size_sqm: sizeSqm ? parseFloat(sizeSqm) : null,
      }),
    });

    setSaving(false);
    if (res.ok) {
      setSpace(await res.json());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.detail || (lang === "de" ? "Etwas ist schiefgelaufen." : "Something went wrong."));
    }
  }

  async function toggleActive() {
    if (space.is_active && !confirm(t.deactivateConfirm)) return;
    const res = await fetch(`/api/spaces/${space.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !space.is_active }),
    });
    if (res.ok) setSpace(await res.json());
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/spaces/${space.id}/images`, { method: "POST", body: form });
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (res.ok) {
      const img = await res.json();
      setImages((prev) => [...prev, img]);
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.detail || (lang === "de" ? "Upload fehlgeschlagen." : "Upload failed."));
    }
  }

  async function deleteImage(imageId: string) {
    const res = await fetch(`/api/spaces/${space.id}/images/${imageId}`, { method: "DELETE" });
    if (res.ok) setImages((prev) => prev.filter((i) => i.id !== imageId));
  }

  async function addBlock(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/spaces/${space.id}/block-dates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ move_in_date: blockStart, move_out_date: blockEnd, note: blockNote }),
    });
    if (res.ok) {
      const block = await res.json();
      setBlocks((prev) => [...(prev || []), block]);
      setBlockStart("");
      setBlockEnd("");
      setBlockNote("");
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.detail || (lang === "de" ? "Etwas ist schiefgelaufen." : "Something went wrong."));
    }
  }

  async function removeBlock(id: string) {
    const res = await fetch(`/api/spaces/${space.id}/block-dates/${id}`, { method: "DELETE" });
    if (res.ok) setBlocks((prev) => (prev ? prev.filter((b) => b.id !== id) : prev));
  }

  return (
    <>
      <form className="dash-section" onSubmit={onSave}>
        {error && <div className="form-error visible">{error}</div>}
        {saved && (
          <div style={{ background: "var(--green-soft)", color: "var(--green-deep)", borderRadius: 10, padding: "10px 14px", fontSize: 13.5, marginBottom: 16 }}>
            {t.changesSaved}
          </div>
        )}

        <div className="field">
          <label>{t.fieldTitle}</label>
          <input type="text" minLength={3} required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label>{t.fieldDescription}</label>
          <textarea
            rows={3}
            style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 10, fontFamily: "inherit", fontSize: 14 }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="field">
          <label>{t.fieldCategory}</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c[lang]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>{t.fieldCity}</label>
          <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="field">
          <label>{t.fieldZip}</label>
          <input type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
        </div>
        <div className="field">
          <label>{t.fieldAddress}</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="field">
          <label>{t.fieldPrice}</label>
          <input type="number" min={1} step={1} required value={priceMonth} onChange={(e) => setPriceMonth(e.target.value)} />
        </div>
        <div className="field">
          <label>{t.fieldSize}</label>
          <input type="number" min={1} step={1} value={sizeSqm} onChange={(e) => setSizeSqm(e.target.value)} />
        </div>

        <AmenitiesPicker value={amenities} onChange={setAmenities} t={t} />

        <button type="submit" className="btn-primary" style={{ marginTop: 16 }} disabled={saving}>
          {t.saveChanges}
        </button>
      </form>

      <div className="dash-section">
        <h2 className="hfont">{t.photosTitle}</h2>
        <p style={{ color: "var(--ink-muted)", fontSize: 13, marginBottom: 12 }}>{t.maxPhotosNote}</p>
        <div className="amenities-grid" style={{ marginBottom: 16 }}>
          {images.map((img) => (
            <div key={img.id} style={{ position: "relative" }}>
              <div style={{ height: 120, borderRadius: 10, background: `url(${img.url}) center/cover`, border: "1px solid var(--border)" }} />
              <button
                type="button"
                className="btn-secondary"
                style={{ marginTop: 6, width: "100%" }}
                onClick={() => deleteImage(img.id)}
              >
                {t.remove}
              </button>
            </div>
          ))}
        </div>
        {images.length < 8 && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={onUpload}
              disabled={uploading}
              style={{ display: "none" }}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? t.uploading : t.uploadPhoto}
            </button>
          </>
        )}
      </div>

      <div className="dash-section">
        <h2 className="hfont">{t.blockedDatesTitle}</h2>
        {blocks === null ? (
          <p style={{ color: "var(--ink-muted)" }}>…</p>
        ) : (
          blocks.map((b) => (
            <div key={b.id} className="dash-listing-row">
              <div className="info">
                <div className="title">
                  {b.move_in_date} → {b.move_out_date}
                </div>
                {b.custom_period_note && <div className="meta">{b.custom_period_note}</div>}
              </div>
              <button className="btn-secondary" onClick={() => removeBlock(b.id)}>
                {t.remove}
              </button>
            </div>
          ))
        )}

        <form onSubmit={addBlock} className="block-form">
          <div className="field">
            <label>{t.searchMoveIn}</label>
            <input type="date" required value={blockStart} onChange={(e) => setBlockStart(e.target.value)} />
          </div>
          <div className="field">
            <label>{t.searchMoveOut}</label>
            <input type="date" required value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} />
          </div>
          <div className="field block-form-note">
            <label>{t.blockedRangeNote}</label>
            <input type="text" value={blockNote} onChange={(e) => setBlockNote(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary block-form-submit">
            {t.addBlockedRange}
          </button>
        </form>
      </div>

      <div className="dash-section">
        <button className="btn-secondary" onClick={toggleActive}>
          {space.is_active ? t.deactivateListing : t.reactivateListing}
        </button>
      </div>
    </>
  );
}
