"use client";

import { useState } from "react";
import { CATEGORIES, type Lang, type Translator } from "@/lib/translations";
import type { AmenityKey } from "@/lib/types";
import AmenitiesPicker from "./AmenitiesPicker";

type Props = {
  lang: Lang;
  t: Translator;
};

export default function ListSpaceForm({ lang, t }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0].key);
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [amenities, setAmenities] = useState<AmenityKey[]>([]);
  const [priceMonth, setPriceMonth] = useState("");
  const [sizeSqm, setSizeSqm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const res = await fetch("/api/spaces", {
      method: "POST",
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

    if (res.ok) {
      const space = await res.json();
      setPublishedId(space.id);
    } else {
      setSubmitting(false);
      const data = await res.json().catch(() => ({}));
      setError(data.detail || (lang === "de" ? "Etwas ist schiefgelaufen." : "Something went wrong."));
    }
  }

  if (publishedId) {
    return (
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <p style={{ color: "var(--green-deep)", fontWeight: 600, marginBottom: 8 }}>{t.listingPublished}</p>
        <p style={{ color: "var(--ink-muted)", fontSize: 14, marginBottom: 16 }}>{t.pendingReviewNotice}</p>
        <a className="btn-primary" style={{ display: "inline-block" }} href={`/listing/${publishedId}?lang=${lang}`}>
          {t.viewListing}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <div className="form-error visible">{error}</div>}

      <div className="field">
        <label>{t.fieldTitle}</label>
        <input
          type="text"
          placeholder={t.fieldTitlePh}
          minLength={3}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="field">
        <label>{t.fieldDescription}</label>
        <textarea
          rows={3}
          placeholder={t.fieldDescriptionPh}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid var(--border)",
            borderRadius: 10,
            fontFamily: "inherit",
            fontSize: 14,
          }}
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
        <input type="text" placeholder={t.fieldAddressPh} value={address} onChange={(e) => setAddress(e.target.value)} />
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

      <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 16 }} disabled={submitting}>
        {t.publishListing}
      </button>
    </form>
  );
}
