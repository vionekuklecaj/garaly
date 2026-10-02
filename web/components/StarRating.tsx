// SVG stars with a fractional-fill overlay (so a 4.8 average renders as
// 4 full stars + a star that's 80% filled, not just rounded) -- replaces
// the plain "★".repeat(n) text, which can't do partial fill and renders
// inconsistently across platforms/fonts.
const STAR_PATH = "M12 1.8l3.18 6.63 7.22.85-5.37 5.05 1.45 7.22L12 17.9l-6.48 3.65 1.45-7.22L1.6 9.28l7.22-.85z";

type Props = {
  value: number;
  size?: number;
  showValue?: boolean;
};

export default function StarRating({ value, size = 16, showValue = false }: Props) {
  const pct = (Math.max(0, Math.min(5, value)) / 5) * 100;

  return (
    <span className="star-rating" style={{ fontSize: size }}>
      <span className="star-stack">
        <span className="star-row star-row-empty">
          {[1, 2, 3, 4, 5].map((n) => (
            <svg key={n} viewBox="0 0 24 24" width={size} height={size}>
              <path d={STAR_PATH} />
            </svg>
          ))}
        </span>
        <span className="star-row star-row-filled" style={{ width: `${pct}%` }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <svg key={n} viewBox="0 0 24 24" width={size} height={size}>
              <path d={STAR_PATH} />
            </svg>
          ))}
        </span>
      </span>
      {showValue && <span className="star-rating-value">{value.toFixed(1)}</span>}
    </span>
  );
}
