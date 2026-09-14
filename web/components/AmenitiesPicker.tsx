"use client";

import { AMENITY_KEYS, type AmenityKey } from "@/lib/types";
import type { Translator } from "@/lib/translations";

type Props = {
  value: AmenityKey[];
  onChange: (next: AmenityKey[]) => void;
  t: Translator;
};

export default function AmenitiesPicker({ value, onChange, t }: Props) {
  function toggle(key: AmenityKey) {
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  }

  return (
    <div className="field">
      <label>{t.amenitiesPickerLabel}</label>
      <div className="chip-row" style={{ margin: "4px 0 0" }}>
        {AMENITY_KEYS.map((key) => (
          <div
            key={key}
            className={`chip${value.includes(key) ? " active" : ""}`}
            onClick={() => toggle(key)}
          >
            {t[`amenity_${key}` as keyof Translator]}
          </div>
        ))}
      </div>
    </div>
  );
}
