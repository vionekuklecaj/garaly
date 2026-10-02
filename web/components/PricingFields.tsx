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

const TIERS: { key: keyof PricingValues; icon: string; unitKey: "perHour" | "perDay" | "perWeek" | "perMonth" }[] = [
  { key: "priceHour", icon: "🕐", unitKey: "perHour" },
  { key: "priceDay", icon: "☀️", unitKey: "perDay" },
  { key: "priceWeek", icon: "📅", unitKey: "perWeek" },
  { key: "priceMonth", icon: "🗓️", unitKey: "perMonth" },
];

// Shared by ListSpaceForm and ManageListingForm -- a host fills in
// whichever of the four periods makes sense for their space (at least one
// required, enforced both here via hasAnyPriceTier() and server-side).
export default function PricingFields({ t, values, onChange }: Props) {
  function set(key: keyof PricingValues, v: string) {
    onChange({ ...values, [key]: v });
  }

  return (
    <div className="price-tiers-card">
      <div className="price-tiers-head">
        <span className="price-tiers-label">{t.pricingSectionTitle}</span>
        <span className="price-tiers-hint">{t.pricingTiersNote}</span>
      </div>
      <div className="price-tiers-grid">
        {TIERS.map((tier) => (
          <div className="price-tier-field" key={tier.key}>
            <label htmlFor={`price-${tier.key}`}>
              <span className="price-tier-icon">{tier.icon}</span> {t[tier.unitKey]}
            </label>
            <div className="price-tier-input-wrap">
              <span className="price-tier-currency">€</span>
              <input
                id={`price-${tier.key}`}
                type="number"
                min={0.01}
                step={0.01}
                placeholder="0"
                value={values[tier.key]}
                onChange={(e) => set(tier.key, e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
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
