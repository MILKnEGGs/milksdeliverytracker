// Everything the app saves. Money is stored in cents so totals add up exactly.

export type ThemeMode = 'auto' | 'light' | 'dark';

/** One TCGplayer checkout (one receipt). It splits into one package per seller. */
export interface Order {
  id: string;
  /** Shown in lists, e.g. "Order of Nov 5". Editable. */
  name: string;
  importedAt: number;
  grandTotal?: number;
  tax?: number;
}

export type PackageStatus = 'waiting' | 'shipped' | 'delivered';

/** One seller's part of an order: what arrives in one envelope. */
export interface Package {
  id: string;
  orderId: string;
  seller: string;
  /** TCGplayer's order number for this seller, e.g. 4D3B2062-CD3067-E954C. Claims need it. */
  orderNumber: string;
  total: number;
  /** Dates as YYYY-MM-DD in local time; set when the status is reached. */
  shippedOn?: string;
  deliveredOn?: string;
  note: string;
}

export type Problem = 'missing' | 'wrong' | 'damaged' | 'condition';

/**
 * One line of the receipt. TCGplayer's receipt doesn't say which seller sent which card, so a card only
 * gets a package when it's checked off while unpacking that envelope, or picked by hand.
 */
export interface Card {
  id: string;
  orderId: string;
  qty: number;
  /** How many have been checked off so far (0..qty). */
  got: number;
  game: string;
  set: string;
  name: string;
  condition: string;
  /** The receipt's full description, kept as-is for claims. */
  desc: string;
  packageId?: string;
  problem?: Problem;
  note: string;
}

export interface Settings {
  theme: ThemeMode;
}

export interface Data {
  version: 1;
  orders: Order[];
  packages: Package[];
  cards: Card[];
  settings: Settings;
}
