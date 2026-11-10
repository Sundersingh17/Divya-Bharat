"use client";

import { Category } from "@/lib/types";

export default function CategoryStrip({
  categories,
  active,
  onSelect
}: {
  categories: Category[];
  active: string;
  onSelect: (id: string) => void;
}) {
  const chipClass = (id: string) =>
    `flex-shrink-0 pb-2 border-b-[2px] text-[13px] font-medium whitespace-nowrap tracking-wide transition-colors ${
      active === id ? "text-ink border-ink" : "text-ink-soft border-transparent hover:text-ink hover:border-line"
    }`;

  return (
    <div className="max-w-6xl mx-auto px-5 pt-8 flex gap-7 overflow-x-auto border-b border-line">
      <button className={chipClass("all")} onClick={() => onSelect("all")}>
        All items
      </button>
      {categories.map((c) => (
        <button key={c.id} className={chipClass(c.id)} onClick={() => onSelect(c.id)}>
          {c.name}
        </button>
      ))}
    </div>
  );
}
