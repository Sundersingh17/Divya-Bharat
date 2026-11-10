"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import ProductImage from "./ProductImage";

type SearchProduct = {
  id: string;
  name: string;
  name_odia: string;
  category_id: string;
  from_price: number;
  pack_size: string;
};

const POPULAR = ["Mustard oil", "Chhatua", "Groundnut oil", "Sesame oil", "Papad", "Dal"];
const CATEGORY_LINKS = [
  { id: "oils", label: "Oils" },
  { id: "chhatua", label: "Chhatua" },
  { id: "flours", label: "Flours" },
  { id: "spices", label: "Spices" },
  { id: "dal", label: "Dal" },
  { id: "papad", label: "Papad" }
];
const RECENT_KEY = "db_recent_searches";

// One lightweight catalogue fetch shared by every search surface, cached
// for the life of the page so opening/closing search never refetches.
let indexCache: SearchProduct[] | null = null;
let indexPromise: Promise<SearchProduct[]> | null = null;

async function loadIndex(): Promise<SearchProduct[]> {
  if (indexCache) return indexCache;
  if (!indexPromise) {
    indexPromise = (async () => {
      const [{ data: products }, { data: variants }] = await Promise.all([
        supabase.from("products").select("id, name, name_odia, category_id, price, pack_size").eq("is_active", true),
        supabase.from("product_variants").select("product_id, price, pack_size, is_default")
      ]);
      const byProduct = new Map<string, any[]>();
      (variants ?? []).forEach((v: any) => {
        const list = byProduct.get(v.product_id) ?? [];
        list.push(v);
        byProduct.set(v.product_id, list);
      });
      indexCache = (products ?? []).map((p: any) => {
        const vs = byProduct.get(p.id);
        const from = vs && vs.length ? Math.min(...vs.map((v) => Number(v.price))) : Number(p.price);
        return {
          id: p.id,
          name: p.name,
          name_odia: p.name_odia ?? "",
          category_id: p.category_id,
          from_price: from,
          pack_size: vs && vs.length ? (vs.find((v) => v.is_default) ?? vs[0]).pack_size : p.pack_size
        };
      });
      return indexCache;
    })();
  }
  return indexPromise;
}

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function pushRecent(term: string) {
  const t = term.trim();
  if (!t) return;
  try {
    const next = [t, ...readRecent().filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable — recents are a nicety, not required
  }
}

// Small edit-distance check so "mustrad oil" or "choliya" still find products.
function within(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return false;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length] <= max;
}

// Every word typed must match (any order). Name-start matches rank first,
// then word-start, then anywhere, then near-misses for longer words.
export function rankProducts(index: SearchProduct[], query: string): SearchProduct[] {
  const raw = query.trim();
  const tokens = raw.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const scored: { p: SearchProduct; score: number }[] = [];
  for (const p of index) {
    if (p.name_odia && p.name_odia.includes(raw)) {
      scored.push({ p, score: 10 });
      continue;
    }
    const name = p.name.toLowerCase();
    const words = `${name} ${p.category_id} ${p.pack_size}`.toLowerCase().split(/[\s\-,/]+/).filter(Boolean);
    let score = 0;
    let ok = true;
    for (const t of tokens) {
      if (name.startsWith(t)) score += 4;
      else if (words.some((w) => w.startsWith(t))) score += 3;
      else if (`${name} ${p.category_id} ${p.pack_size}`.toLowerCase().includes(t)) score += 1.5;
      else if (t.length >= 4 && words.some((w) => within(t, w, t.length >= 7 ? 2 : 1))) score += 0.5;
      else {
        ok = false;
        break;
      }
    }
    if (ok) scored.push({ p, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name)).map((x) => x.p);
}

function useSearch(active: boolean) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchProduct[]>(indexCache ?? []);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    if (!active) return;
    setRecent(readRecent());
    loadIndex().then(setIndex);
  }, [active]);

  const results = useMemo(() => rankProducts(index, query), [query, index]);

  return { query, setQuery, results, recent, setRecent };
}

function ResultRow({ p, onPick, active }: { p: SearchProduct; onPick: () => void; active?: boolean }) {
  return (
    <Link
      id={`search-opt-${p.id}`}
      role="option"
      aria-selected={!!active}
      href={`/product/${p.id}`}
      onClick={onPick}
      className={`flex items-center gap-3.5 px-4 py-2.5 hover:bg-cream-2/70 ${active ? "bg-cream-2" : ""}`}
    >
      <div className="h-12 w-12 flex-shrink-0 overflow-hidden bg-cream-2">
        <ProductImage productId={p.id} categoryId={p.category_id} alt={p.name} className="h-full w-full" iconSize="text-xl" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-medium text-ink">{p.name}</div>
        <div className="truncate text-[11.5px] text-ink-soft">{p.name_odia || p.pack_size}</div>
      </div>
      <div className="text-[12.5px] font-semibold tabular-nums text-ink">from ₹{p.from_price}</div>
    </Link>
  );
}

function Suggestions({
  query,
  results,
  recent,
  onTerm,
  onPick,
  onClearRecent,
  cursor = -1
}: {
  query: string;
  results: SearchProduct[];
  recent: string[];
  onTerm: (t: string) => void;
  onPick: () => void;
  onClearRecent: () => void;
  cursor?: number;
}) {
  const label = "px-4 pb-2 pt-4 text-[10.5px] font-semibold uppercase tracking-eyebrow text-ink-soft";
  if (query.trim()) {
    return results.length === 0 ? (
      <div className="px-5 py-8 text-center text-[13px] text-ink-soft">
        No products match “{query.trim()}”. Try “oil”, “chhatua” or “dal”.
      </div>
    ) : (
      <div className="py-1">
        <div className={label}>Products</div>
        <div role="listbox" id="search-results" aria-label="Matching products">
          {results.slice(0, 6).map((p, i) => (
            <ResultRow key={p.id} p={p} onPick={onPick} active={i === cursor} />
          ))}
        </div>
        <Link
          href={`/collections?q=${encodeURIComponent(query.trim())}`}
          onClick={onPick}
          className="block border-t border-line px-4 py-3 text-[12px] font-semibold uppercase tracking-[.1em] text-red hover:text-red-dark"
        >
          View all {results.length} result{results.length === 1 ? "" : "s"} →
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-3">
      {recent.length > 0 && (
        <>
          <div className="flex items-center justify-between pr-4">
            <div className={label}>Recent</div>
            <button onClick={onClearRecent} className="pt-3 text-[11px] text-ink-soft underline">
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2 px-4">
            {recent.map((r) => (
              <button key={r} onClick={() => onTerm(r)} className="pill">
                <i className="ti ti-history mr-1.5 text-[13px]" aria-hidden="true" />
                {r}
              </button>
            ))}
          </div>
        </>
      )}
      <div className={label}>Popular searches</div>
      <div className="flex flex-wrap gap-2 px-4">
        {POPULAR.map((t) => (
          <button key={t} onClick={() => onTerm(t)} className="pill">
            {t}
          </button>
        ))}
      </div>
      <div className={label}>Browse categories</div>
      <div className="flex flex-wrap gap-2 px-4">
        {CATEGORY_LINKS.map((c) => (
          <Link key={c.id} href={`/collections/${c.id}`} onClick={onPick} className="pill">
            {c.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Desktop: inline field in the header with a dropdown panel           */
/* ------------------------------------------------------------------ */

export function SearchBox({ placeholder = "Search oils, chhatua, dal…" }: { placeholder?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { query, setQuery, results, recent, setRecent } = useSearch(open);
  const [cursor, setCursor] = useState(-1);
  const shown = Math.min(results.length, 6);
  useEffect(() => setCursor(-1), [query]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function submit() {
    const t = query.trim();
    if (!t) return;
    pushRecent(t);
    setOpen(false);
    router.push(`/collections?q=${encodeURIComponent(t)}`);
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="relative">
        <i
          className="ti ti-search pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[16px] text-ink-soft"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && shown) {
              e.preventDefault();
              setCursor((c) => (c + 1) % shown);
            } else if (e.key === "ArrowUp" && shown) {
              e.preventDefault();
              setCursor((c) => (c <= 0 ? shown - 1 : c - 1));
            } else if (e.key === "Enter") {
              if (cursor >= 0 && results[cursor]) {
                pushRecent(query);
                setOpen(false);
                router.push(`/product/${results[cursor].id}`);
              } else submit();
            }
            if (e.key === "Escape") setOpen(false);
          }}
          role="combobox"
          aria-expanded={open && !!query.trim()}
          aria-controls="search-results"
          aria-autocomplete="list"
          aria-activedescendant={cursor >= 0 && results[cursor] ? `search-opt-${results[cursor].id}` : undefined}
          placeholder={placeholder}
          aria-label="Search products"
          className="w-full border border-line bg-warm py-2.5 pl-10 pr-4 text-[13px] text-ink placeholder:text-ink-soft/70 focus:border-ink focus:outline-none"
        />
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-[70vh] overflow-y-auto border border-line bg-warm shadow-lg animate-overlayIn">
          <Suggestions
            query={query}
            results={results}
            recent={recent}
            cursor={cursor}
            onTerm={(t) => setQuery(t)}
            onPick={() => {
              pushRecent(query);
              setOpen(false);
            }}
            onClearRecent={() => {
              localStorage.removeItem(RECENT_KEY);
              setRecent([]);
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile: full-screen overlay                                         */
/* ------------------------------------------------------------------ */

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, setQuery, results, recent, setRecent } = useSearch(open);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      document.body.style.overflow = "hidden";
      return () => {
        clearTimeout(t);
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function submit() {
    const t = query.trim();
    if (!t) return;
    pushRecent(t);
    onClose();
    router.push(`/collections?q=${encodeURIComponent(t)}`);
  }

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-cream animate-overlayIn" role="dialog" aria-modal="true" aria-label="Search">
      <div className="flex items-center gap-2 border-b border-line bg-warm px-3 py-3">
        <div className="relative flex-1">
          <i
            className="ti ti-search pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[17px] text-ink-soft"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Search oils, chhatua, dal…"
            aria-label="Search products"
            className="w-full border border-line bg-cream py-3 pl-10 pr-4 text-[15px] focus:border-ink focus:outline-none"
          />
        </div>
        <button onClick={onClose} className="px-2 py-2 text-[13px] font-semibold text-ink">
          Cancel
        </button>
      </div>
      <div className="flex-1 overflow-y-auto bg-warm">
        <Suggestions
          query={query}
          results={results}
          recent={recent}
          onTerm={(t) => setQuery(t)}
          onPick={() => {
            pushRecent(query);
            onClose();
          }}
          onClearRecent={() => {
            localStorage.removeItem(RECENT_KEY);
            setRecent([]);
          }}
        />
      </div>
    </div>
  );
}
