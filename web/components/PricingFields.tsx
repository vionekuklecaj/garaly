"use client";

import type { Translator } from "@/lib/translations";

export type PricingValues = {
  priceHour: string;
  priceDay: string;
  priceWeek: string;
  priceMonth: string;
};

type Props = {
  t: Translator;
  values: PricingValues;
  onChange: (next: PricingValues) => void;
};

// Shared by ListSpaceForm and ManageListingForm -- a host fills in
// whichever of the four periods makes sense for their space (at least one
// required, enforced both here via hasAnyPriceTier() and server-side).
export default function PricingFields({ t, values, onChange }: Props) {
  function set(key: keyof PricingValues, v: string) {
    onChange({ ...values, [key]: v });
  }

  return (
    <>
      <div className="price-tiers-grid">
        <div className="field">
          <label>{t.fieldPriceHour}</label>
          <input type="number" min={0.01} step={0.01} value={values.priceHour} onChange={(e) => set("priceHour", e.target.value)} />
        </div>
        <div className="field">
          <label>{t.fieldPriceDay}</label>
          <input type="number" min={0.01} step={0.01} value={values.priceDay} onChange={(e) => set("priceDay", e.target.value)} />
        </div>
        <div className="field">
          <label>{t.fieldPriceWeek}</label>
          <input type="number" min={0.01} step={0.01} value={values.priceWeek} onChange={(e) => set("priceWeek", e.target.value)} />
        </div>
        <div className="field">
          <label>{t.fieldPriceMonth}</label>
          <input type="number" min={0.01} step={0.01} value={values.priceMonth} onChange={(e) => set("priceMonth", e.target.value)} />
        </div>
      </div>
      <p className="price-tiers-note">{t.pricingTiersNote}</p>
    </>
  );
}

export function hasAnyPriceTier(values: PricingValues): boolean {
  return [values.priceHour, values.priceDay, values.priceWeek, values.priceMonth].some((v) => v.trim() !== "");
}

export function priceTierPayload(values: PricingValues) {
  const num = (v: string) => (v.trim() === "" ? null : parseFloat(v));
  return {
    price_hour: num(values.priceHour),
    price_day: num(values.priceDay),
    price_week: num(values.priceWeek),
    price_month: num(values.priceMonth),
  };
}
