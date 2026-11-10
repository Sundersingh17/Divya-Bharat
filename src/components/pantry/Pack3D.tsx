"use client";

import { useEffect, useState } from "react";

// A product as a real CSS-3D object (no WebGL, no extra library).
//  - With a transparent cut-out on file (<id>-front-cut.webp / <id>-back-cut.webp
//    in the image bucket) it is a standee: front and back cut-outs with a dark
//    layered core between them, so it has body when it turns.
//  - Without one it is a slab: your front photo on one face, back photo on the
//    other, with thickness edges. Either way it genuinely turns to show the back.
// It is not a modelled 360° render; it only has the two faces that were supplied.

const probe = new Map<string, Promise<boolean>>();
function exists(url: string): Promise<boolean> {
  let p = probe.get(url);
  if (!p) {
    p = new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
    probe.set(url, p);
  }
  return p;
}

const SUFFIX = /-(front|back)(-card)?\.webp(\?.*)?$/;
const cutOf = (url: string | null) => (url && SUFFIX.test(url) ? url.replace(SUFFIX, "-$1-cut.webp$3") : null);
const cardOf = (url: string | null) => (url && /-(front|back)\.webp(\?.*)?$/.test(url) ? url.replace(/\.webp/, "-card.webp") : url);

function Face({ src, fallback, className, style }: { src: string | null; fallback?: string | null; className?: string; style?: React.CSSProperties }) {
  const [url, setUrl] = useState(src);
  useEffect(() => setUrl(src), [src]);
  if (!url) return <div className={className} style={{ ...style, background: "#E8DED1" }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" draggable={false} className={className} style={style} onError={() => fallback && url !== fallback && setUrl(fallback)} />;
}

export default function Pack3D({
  frontUrl,
  backUrl,
  size,
  depth = 16,
  rotateY = 0,
  flipped = false,
  sway = false,
  swayDelay = 0
}: {
  frontUrl: string | null;
  backUrl: string | null;
  size: number; // px width of the pack
  depth?: number;
  rotateY?: number;
  flipped?: boolean;
  sway?: boolean;
  swayDelay?: number;
}) {
  const cutFront = cutOf(frontUrl);
  const cutBack = cutOf(backUrl ?? frontUrl);
  const [hasCut, setHasCut] = useState(false);
  useEffect(() => {
    let live = true;
    if (cutFront) exists(cutFront).then((ok) => live && setHasCut(ok));
    return () => {
      live = false;
    };
  }, [cutFront]);

  const h = hasCut ? Math.round(size * 1.18) : size;
  const half = depth / 2;
  const front = cardOf(frontUrl);
  const back = cardOf(backUrl ?? frontUrl);
  const hide: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" };
  const edge = "linear-gradient(90deg,#B9A585,#D8C7A6,#B9A585)";

  return (
    <div style={{ width: size, height: h, position: "relative" }}>
      <div
        className={sway ? "pack3d-sway" : undefined}
        style={{ width: "100%", height: "100%", transformStyle: "preserve-3d", animationDelay: `${swayDelay}s` }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            transformStyle: "preserve-3d",
            transform: `rotateY(${rotateY + (flipped ? 180 : 0)}deg)`,
            transition: "transform 800ms cubic-bezier(.2,.7,.2,1)"
          }}
        >
          {hasCut ? (
            <>
              <Face src={cutFront} fallback={frontUrl} style={{ ...hide, objectFit: "contain", objectPosition: "center bottom", transform: `translateZ(${half}px)` }} />
              <Face src={cutBack} fallback={backUrl} style={{ ...hide, objectFit: "contain", objectPosition: "center bottom", transform: `rotateY(180deg) translateZ(${half}px)` }} />
              {[0.25, 0.5, 0.75].map((k) => (
                <Face
                  key={k}
                  src={cutFront}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    objectPosition: "center bottom",
                    transform: `translateZ(${half - k * depth}px)`,
                    filter: "brightness(.42) saturate(.7)"
                  }}
                />
              ))}
            </>
          ) : (
            <>
              <Face src={front} fallback={frontUrl} style={{ ...hide, objectFit: "cover", transform: `translateZ(${half}px)` }} />
              <Face src={back} fallback={backUrl ?? frontUrl} style={{ ...hide, objectFit: "cover", transform: `rotateY(180deg) translateZ(${half}px)` }} />
              <div style={{ position: "absolute", top: 0, left: size / 2 - half, width: depth, height: h, background: edge, transform: `rotateY(90deg) translateZ(${size / 2}px)` }} />
              <div style={{ position: "absolute", top: 0, left: size / 2 - half, width: depth, height: h, background: edge, transform: `rotateY(-90deg) translateZ(${size / 2}px)` }} />
              <div style={{ position: "absolute", left: 0, top: h / 2 - half, width: size, height: depth, background: "#CBB894", transform: `rotateX(90deg) translateZ(${h / 2}px)` }} />
              <div style={{ position: "absolute", left: 0, top: h / 2 - half, width: size, height: depth, background: "#A8946F", transform: `rotateX(-90deg) translateZ(${h / 2}px)` }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
