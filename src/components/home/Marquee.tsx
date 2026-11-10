// A slow editorial ticker. Server component: pure CSS animation, so it
// ships no JavaScript. The second copy is aria-hidden so screen readers
// hear the phrases once, and the track pauses on hover so it can be read.
const ITEMS = ["Mustard oil", "Chhatua", "Cold pressed", "Traditional", "Odisha", "Made with care", "Kachi ghani", "Stone ground"];

function Seed() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="flex-shrink-0 text-turmeric">
      <circle cx="7" cy="7" r="3.2" fill="currentColor" />
      <circle cx="7" cy="7" r="6.2" fill="none" stroke="currentColor" strokeOpacity=".5" strokeDasharray="1.5 3" />
    </svg>
  );
}

function Row({ hidden }: { hidden?: boolean }) {
  return (
    <ul className="flex flex-shrink-0 items-center gap-8 pr-8 md:gap-12 md:pr-12" aria-hidden={hidden || undefined}>
      {ITEMS.map((item) => (
        <li key={item} className="flex items-center gap-8 md:gap-12">
          <span className="whitespace-nowrap font-serif text-[18px] font-semibold uppercase tracking-[.06em] text-warm md:text-[24px]">
            {item}
          </span>
          <Seed />
        </li>
      ))}
    </ul>
  );
}

export default function Marquee() {
  return (
    <div className="overflow-hidden border-y border-leaf-2 bg-leaf py-3 md:py-4" role="region" aria-label="What we stand for">
      <div className="marquee-track flex w-max animate-marquee">
        <Row />
        <Row hidden />
      </div>
    </div>
  );
}
