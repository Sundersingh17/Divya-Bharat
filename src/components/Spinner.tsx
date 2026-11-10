"use client";

export default function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-10 text-sm text-ink-soft">
      <span className="w-4 h-4 rounded-full border-2 border-line border-t-red animate-spin" />
      {label && <span>{label}</span>}
    </div>
  );
}
