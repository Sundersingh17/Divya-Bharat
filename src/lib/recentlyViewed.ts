// "Recently viewed" is kept only in this browser (localStorage). It stores a
// tiny snapshot per product so the strip can render without any network call.
export type RecentItem = {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  imageUrl: string | null;
};

const KEY = "db_recent_v1";
const MAX = 8;

export function getRecent(): RecentItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function addRecent(item: RecentItem) {
  try {
    const next = [item, ...getRecent().filter((r) => r.id !== item.id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — the strip simply stays empty */
  }
}
