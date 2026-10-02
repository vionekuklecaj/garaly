import type { Translator } from "./translations";
import type { Space } from "./types";

type UnitKey = "perHour" | "perDay" | "perWeek" | "perMonth";

// Smallest set tier wins as the "headline" price shown on a card -- the
// most attention-grabbing entry price, similar to "from $X" on other
// marketplaces. The actual total for a specific booking period is priced
// server-side (see app/pricing.py) and shown separately once dates are
// picked.
export function headlinePrice(space: Space): { amount: number; unit: UnitKey } | null {
  if (space.price_hour != null) return { amount: space.price_hour, unit: "perHour" };
  if (space.price_day != null) return { amount: space.price_day, unit: "perDay" };
  if (space.price_week != null) return { amount: space.price_week, unit: "perWeek" };
  if (space.price_month != null) return { amount: space.price_month, unit: "perMonth" };
  return null;
}

export function formatHeadlinePrice(space: Space, t: Translator): string {
  const hp = headlinePrice(space);
  if (!hp) return "";
  return `${t.fromPricePrefix} ${Number(hp.amount).toFixed(0)} € / ${t[hp.unit]}`;
}

export function formatPriceTiers(space: Space): { amount: number; unit: UnitKey }[] {
  const tiers: { amount: number; unit: UnitKey }[] = [];
  if (space.price_hour != null) tiers.push({ amount: space.price_hour, unit: "perHour" });
  if (space.price_day != null) tiers.push({ amount: space.price_day, unit: "perDay" });
  if (space.price_week != null) tiers.push({ amount: space.price_week, unit: "perWeek" });
  if (space.price_month != null) tiers.push({ amount: space.price_month, unit: "perMonth" });
  return tiers;
}
