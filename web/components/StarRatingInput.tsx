"use client";

import { useState } from "react";

const STAR_PATH = "M12 1.8l3.18 6.63 7.22.85-5.37 5.05 1.45 7.22L12 17.9l-6.48 3.65 1.45-7.22L1.6 9.28l7.22-.85z";

type Props = {
  value: number;
  onChange: (n: number) => void;
  size?: number;
};

// Replaces the native <select> rating picker (which could only show plain
// "★★★★☆" text per option) with real clickable/hoverable stars.
export default function StarRatingInput({ value, onChange, size = 30 }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;

  return (
    <div className="star-rating-input" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star-input-btn${n <= display ? " filled" : ""}`}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <svg viewBox="0 0 24 24" width={size} height={size}>
            <path d={STAR_PATH} />
          </svg>
        </button>
      ))}
    </div>
  );
}
