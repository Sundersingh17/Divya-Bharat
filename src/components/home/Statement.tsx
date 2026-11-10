import { Container, Reveal, SectionHeading } from "../ui";

// A deliberately quiet moment between louder sections: one sentence, huge
// type, lots of air. Server component, no JS of its own.
export default function Statement() {
  return (
    <section className="bg-warm py-20 md:py-28" aria-label="Brand statement">
      <Container>
        <Reveal>
          <SectionHeading variant="statement" title="Good food starts with good sources." />
          <div className="flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[.28em] text-ink-soft">
            <span className="h-px w-12 bg-ink/40" aria-hidden="true" />
            Divya Bharat · Odisha
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
