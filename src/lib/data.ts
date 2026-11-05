// Pure helpers over the saved data: importing receipts, package status, and the claim report.

import type { ParsedReceipt } from './parse';
import type { Card, Data, Order, Package, PackageStatus, Problem } from './types';

export const uid = (): string => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function newData(): Data {
  return { version: 1, orders: [], packages: [], cards: [], settings: { theme: 'auto' } };
}

/** Fills in anything missing from older saves or hand-edited backups. */
export function normalize(raw: Partial<Data>): Data {
  const d = newData();
  d.orders = Array.isArray(raw.orders) ? raw.orders : [];
  d.packages = (Array.isArray(raw.packages) ? raw.packages : []).map((p) => ({ ...p, note: p.note ?? '' }));
  d.cards = (Array.isArray(raw.cards) ? raw.cards : []).map((c) => ({
    ...c,
    got: Math.min(c.qty, Math.max(0, c.got ?? 0)),
    note: c.note ?? '',
  }));
  d.settings = { ...d.settings, ...(raw.settings ?? {}) };
  return d;
}

// ---------------------------------------------------------------------------------------------
// Dates (YYYY-MM-DD in local time, so "today" matches the calendar on the wall)

export function today(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

/** "2026-11-05" → "Nov 5". */
export function shortDate(iso: string | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Whole days from an ISO date until today. */
export function daysSince(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const [ty, tm, td] = today().split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(y, m - 1, d)) / 86_400_000);
}

/** "today", "1 day ago", "6 days ago". */
export function ago(iso: string): string {
  const n = daysSince(iso);
  return n <= 0 ? 'today' : n === 1 ? '1 day ago' : `${n} days ago`;
}

export const money = (c: number | undefined): string => (c === undefined ? '' : `$${(c / 100).toFixed(2)}`);

// ---------------------------------------------------------------------------------------------
// Importing

export interface ImportResult {
  order?: Order;
  added: number;
  /** Sellers whose order number was already imported; skipped so nothing doubles up. */
  duplicates: number;
}

export function importReceipt(d: Data, r: ParsedReceipt, name?: string): ImportResult {
  const known = new Set(d.packages.map((p) => p.orderNumber));
  const fresh = r.sellers.filter((s) => !known.has(s.orderNumber));
  const duplicates = r.sellers.length - fresh.length;
  if (!fresh.length) return { added: 0, duplicates };

  const order: Order = {
    id: uid(),
    name: name?.trim() || `Order of ${shortDate(today())}`,
    importedAt: Date.now(),
    grandTotal: r.grandTotal,
    tax: r.tax,
  };
  d.orders.push(order);
  for (const s of fresh) d.packages.push({ id: uid(), orderId: order.id, seller: s.seller, orderNumber: s.orderNumber, total: s.total, note: '' });
  // When some sellers were already imported, the card lines would double up too, so only take cards for a
  // receipt that's entirely new.
  if (!duplicates) for (const c of r.cards) d.cards.push({ id: uid(), orderId: order.id, got: 0, note: '', ...c });
  return { order, added: fresh.length, duplicates };
}

export function deleteOrder(d: Data, orderId: string): void {
  d.orders = d.orders.filter((o) => o.id !== orderId);
  d.packages = d.packages.filter((p) => p.orderId !== orderId);
  d.cards = d.cards.filter((c) => c.orderId !== orderId);
}

// ---------------------------------------------------------------------------------------------
// Packages

export const statusOf = (p: Package): PackageStatus => (p.deliveredOn ? 'delivered' : p.shippedOn ? 'shipped' : 'waiting');

export function setShipped(p: Package, on: boolean): void {
  p.shippedOn = on ? (p.shippedOn ?? today()) : undefined;
  if (!on) p.deliveredOn = undefined;
}

export function setDelivered(p: Package, on: boolean): void {
  p.deliveredOn = on ? (p.deliveredOn ?? today()) : undefined;
  // Something that arrived obviously shipped; TCGplayer doesn't always email first.
  if (on && !p.shippedOn) p.shippedOn = p.deliveredOn;
}

export const packageOf = (d: Data, id: string | undefined): Package | undefined => (id ? d.packages.find((p) => p.id === id) : undefined);

export const cardsFrom = (d: Data, p: Package): Card[] => d.cards.filter((c) => c.packageId === p.id);

export function counts(d: Data): Record<PackageStatus, number> {
  const n = { waiting: 0, shipped: 0, delivered: 0 };
  for (const p of d.packages) n[statusOf(p)]++;
  return n;
}

// ---------------------------------------------------------------------------------------------
// Cards

export const isDone = (c: Card): boolean => c.got >= c.qty;
export const cardCount = (cards: { qty: number }[]): number => cards.reduce((n, c) => n + c.qty, 0);

export const PROBLEMS: Record<Problem, { label: string; emoji: string }> = {
  missing: { label: 'Missing', emoji: '❓' },
  wrong: { label: 'Wrong card', emoji: '🔀' },
  damaged: { label: 'Damaged', emoji: '💥' },
  condition: { label: 'Worse condition than listed', emoji: '📉' },
};

/** Checks off one card line (all copies) or un-checks it. While unpacking, it's tagged with that envelope. */
export function toggleCard(c: Card, unpacking?: Package): void {
  if (isDone(c)) {
    c.got = 0;
    if (unpacking && c.packageId === unpacking.id) c.packageId = undefined;
  } else {
    c.got = c.qty;
    if (unpacking) c.packageId = unpacking.id;
    if (c.problem === 'missing') c.problem = undefined;
  }
}

export function matches(c: Card, q: string): boolean {
  if (!q) return true;
  const hay = c.desc.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

export interface CardGroup {
  key: string;
  game: string;
  set: string;
  cards: Card[];
}

/** Groups by game then set, keeping the receipt's order (which is alphabetical). */
export function groupCards(cards: Card[]): CardGroup[] {
  const map = new Map<string, CardGroup>();
  for (const c of cards) {
    const key = `${c.game}\u0000${c.set}`;
    let g = map.get(key);
    if (!g) map.set(key, (g = { key, game: c.game, set: c.set, cards: [] }));
    g.cards.push(c);
  }
  return [...map.values()];
}

/** "Star Wars Unlimited" → "SWU"-style short tag for compact rows. */
export function gameTag(game: string): string {
  const known: Record<string, string> = {
    'Star Wars Unlimited': 'SWU',
    'Dragon Ball Super Fusion World': 'Fusion World',
    UniVersus: 'UVS',
    'One Piece Card Game': 'One Piece',
    'Digimon Card Game': 'Digimon',
    'Magic: The Gathering': 'MTG',
    Pokemon: 'Pokémon',
  };
  return known[game] ?? game;
}

// ---------------------------------------------------------------------------------------------
// Claim report

export interface Report {
  /** Shipped but not arrived: the ones to chase. */
  late: Package[];
  /** Not even shipped yet. */
  unshipped: Package[];
  /** Flagged cards with a known seller, grouped by package. */
  bySeller: { pkg: Package; cards: Card[] }[];
  /** Flagged cards nobody has tied to a seller yet. */
  unassigned: Card[];
  /** Not checked off and not flagged. Only "missing" once everything has arrived. */
  notReceived: Card[];
  allDelivered: boolean;
}

export function buildReport(d: Data): Report {
  const late = d.packages.filter((p) => statusOf(p) === 'shipped');
  const unshipped = d.packages.filter((p) => statusOf(p) === 'waiting');
  const flagged = d.cards.filter((c) => c.problem);
  const bySeller = d.packages
    .map((pkg) => ({ pkg, cards: flagged.filter((c) => c.packageId === pkg.id) }))
    .filter((g) => g.cards.length);
  const unassigned = flagged.filter((c) => !packageOf(d, c.packageId));
  const notReceived = d.cards.filter((c) => !c.problem && !isDone(c));
  return { late, bySeller, unassigned, notReceived, unshipped, allDelivered: !late.length && !unshipped.length && d.packages.length > 0 };
}

const cardLine = (c: Card): string => {
  const short = c.got > 0 && c.got < c.qty ? ` (got ${c.got} of ${c.qty})` : '';
  const what = c.problem ? `${PROBLEMS[c.problem].label}: ` : '';
  const note = c.note.trim() ? ` (${c.note.trim()})` : '';
  return `  • ${what}${c.qty}× ${c.desc}${short}${note}`;
};

export function reportText(r: Report): string {
  const out: string[] = [`TCGplayer order problems (as of ${shortDate(today())})`];
  const pkgHead = (p: Package) => `${p.seller} · Order ${p.orderNumber} · ${money(p.total)}`;

  if (r.bySeller.length) {
    out.push('', 'PROBLEMS BY SELLER');
    for (const g of r.bySeller) {
      out.push(pkgHead(g.pkg) + (g.pkg.deliveredOn ? ` · arrived ${shortDate(g.pkg.deliveredOn)}` : ''));
      out.push(...g.cards.map(cardLine));
    }
  }
  if (r.unassigned.length) {
    out.push('', 'PROBLEMS, SELLER NOT KNOWN YET');
    out.push(...r.unassigned.map(cardLine));
  }
  if (r.late.length) {
    out.push('', `SHIPPED, NOT ARRIVED YET (${r.late.length})`);
    for (const p of r.late) out.push(`  • ${pkgHead(p)} · shipped ${shortDate(p.shippedOn)} (${ago(p.shippedOn!)})`);
  }
  if (r.unshipped.length) {
    out.push('', `NOT SHIPPED YET (${r.unshipped.length})`);
    for (const p of r.unshipped) out.push(`  • ${pkgHead(p)}`);
  }
  if (r.notReceived.length) {
    out.push('', r.allDelivered ? `CARDS NEVER RECEIVED (${cardCount(r.notReceived)})` : `CARDS NOT CHECKED OFF YET (${cardCount(r.notReceived)})`);
    out.push(...r.notReceived.map(cardLine));
  }
  if (out.length === 1) out.push('', 'Everything arrived and checked out. 🎉');
  return out.join('\n');
}

// ---------------------------------------------------------------------------------------------
// Backup

export const backupJson = (d: Data): string => JSON.stringify({ app: 'milks-deliveries', ...d }, null, 1);

export function parseBackup(text: string): Data {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file isn't a backup from Milk's Delivery Tracker.");
  }
  if (!raw || typeof raw !== 'object' || (raw as { app?: string }).app !== 'milks-deliveries')
    throw new Error("That file isn't a backup from Milk's Delivery Tracker.");
  return normalize(raw as Partial<Data>);
}
