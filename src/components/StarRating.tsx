"use client";

export function StarDisplay({ rating, size = "text-sm" }: { rating: number; size?: string }) {
  return (
    <span className={`${size} tracking-tight`} aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= Math.round(rating) ? "text-gold" : "text-line"}>
          ★
        </span>
      ))}
    </span>
  );
}

export function StarInput({
  value,
  onChange
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className={`text-2xl leading-none transition-colors ${
            i <= value ? "text-gold" : "text-line hover:text-gold-soft"
          }`}
          aria-label={`Rate ${i} star${i === 1 ? "" : "s"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
