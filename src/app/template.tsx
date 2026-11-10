// Re-mounts on every navigation, so page content fades up 8px over ~220ms.
// Pure CSS: it never blocks navigation, and reduced-motion users get no
// animation (see globals.css).
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" className="page-enter">
      {children}
    </main>
  );
}
