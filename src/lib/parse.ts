// Reads the text of a TCGplayer "Order Details" receipt (copied from the order page or saved as .txt).
//
// The receipt has three parts:
//   Grand Total: $290.12
//   <Seller name> $6.10                       one pair of lines per seller
//   Order Number: 4D3B2062-CD3067-E954C - [Track Order | Contact Seller]
//   IA Sales Tax: $15.23
//   Qty  Description                          then one line per card, sorted by name, not by seller
//   2    Game - Set - Card name - Condition

export interface ParsedSeller {
  seller: string;
  orderNumber: string;
  total: number;
}

export interface ParsedCard {
  qty: number;
  game: string;
  set: string;
  name: string;
  condition: string;
  desc: string;
}

export interface ParsedReceipt {
  grandTotal?: number;
  tax?: number;
  sellers: ParsedSeller[];
  cards: ParsedCard[];
}

/** "$1,234.56" → 123456 cents. */
export function cents(s: string): number {
  const [whole, frac = '0'] = s.replace(/[$,\s]/g, '').split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0').slice(0, 2));
}

const MONEY = String.raw`\$\s?([\d,]+(?:\.\d{1,2})?)`;
const SELLER_LINE = new RegExp(String.raw`^(.+?)\s+${MONEY}\s*$`);
const ORDER_LINE = /^Order Number:\s*([A-Za-z0-9-]+)/i;
const GRAND_LINE = new RegExp(String.raw`^Grand Total:\s*${MONEY}`, 'i');
const TAX_LINE = new RegExp(String.raw`Sales Tax:\s*${MONEY}`, 'i');
// Tab-separated on the receipt; spaces when pasted from some browsers.
const CARD_LINE = /^(\d{1,3})\s+(.+ - .+)$/;

/** "Star Wars Unlimited - Homeworlds - Leia Organa - These Are My Friends - Near Mint" → its parts. */
export function splitDescription(desc: string): Omit<ParsedCard, 'qty'> {
  const parts = desc.split(' - ');
  if (parts.length < 4) return { game: parts.length > 1 ? parts[0] : '', set: '', name: desc, condition: '', desc };
  // Card names can contain " - " (subtitles, card numbers), so the name is everything between set and condition.
  return {
    game: parts[0],
    set: parts[1],
    name: parts.slice(2, -1).join(' - '),
    condition: parts[parts.length - 1],
    desc,
  };
}

export function parseReceipt(text: string): ParsedReceipt {
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.replace(/ /g, ' ').trimEnd());
  const out: ParsedReceipt = { sellers: [], cards: [] };
  let inCards = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    let m: RegExpMatchArray | null;
    if ((m = line.match(GRAND_LINE))) {
      out.grandTotal = cents(m[1]);
      continue;
    }
    if (/^Qty\s+Description/i.test(line)) {
      inCards = true;
      continue;
    }
    if ((m = line.match(TAX_LINE))) {
      out.tax = cents(m[1]);
      continue;
    }

    if (inCards) {
      if ((m = line.match(CARD_LINE))) out.cards.push({ qty: Number(m[1]), ...splitDescription(m[2].trim()) });
      continue;
    }

    // A seller is a "Name $x.xx" line followed (after optional blank lines) by "Order Number: …".
    if ((m = line.match(SELLER_LINE))) {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      const om = lines[j]?.trim().match(ORDER_LINE);
      if (om) {
        out.sellers.push({ seller: m[1].trim(), total: cents(m[2]), orderNumber: om[1] });
        i = j;
      }
    }
  }
  return out;
}
