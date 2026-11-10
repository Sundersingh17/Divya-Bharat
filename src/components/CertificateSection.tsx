"use client";

import { useEffect, useState } from "react";

type Certificate = { id: string; title: string; file_url: string; uploaded_at: string };

// Renders nothing at all if the product has no certificates uploaded —
// this is a trust signal, not a required section, so an empty state
// would just be clutter on most product pages until certs are added.
export default function CertificateSection({ productId }: { productId: string }) {
  const [certs, setCerts] = useState<Certificate[] | null>(null);

  useEffect(() => {
    fetch(`/api/certificates?productId=${encodeURIComponent(productId)}`)
      .then((r) => r.json())
      .then((d) => setCerts(d.certificates ?? []));
  }, [productId]);

  if (!certs || certs.length === 0) return null;

  return (
    <div className="mt-6 pt-5 border-t border-line">
      <h3 className="text-[11px] font-semibold text-ink-soft uppercase tracking-wide mb-2.5">
        Lab reports &amp; certificates
      </h3>
      <div className="flex flex-wrap gap-2">
        {certs.map((c) => (
          <a
            key={c.id}
            href={c.file_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-[12px] font-medium text-red-dark border border-line px-3 py-1.5 hover:border-ink transition-colors"
          >
            <span aria-hidden="true">📄</span>
            {c.title}
          </a>
        ))}
      </div>
    </div>
  );
}
