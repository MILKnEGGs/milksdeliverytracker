import { describe, expect, it } from 'vitest';
import { buildReport, importReceipt, newData, reportText, setDelivered, setShipped, statusOf, toggleCard } from './data';
import { cents, parseReceipt, splitDescription } from './parse';

// Same layout as a real TCGplayer receipt; sellers and order numbers are made up.
const RECEIPT = `Order Details

Grand Total: $1,021.95

Alpha Cards $6.10
Order Number: AAAA1111-BBBB22-CCC33 - [Track Order | Contact Seller]

Beta Games TCG $5.13
Order Number: DDDD4444-EEEE55-FFF66 - [Track Order | Contact Seller]

IA Sales Tax: $15.23



Qty\tDescription
2\tDragon Ball Super Fusion World - Awakened Pulse - Ginyu - FB01-104 - Near Mint Holofoil
1\tStar Wars Unlimited - Homeworlds - Leia Organa - These Are My Friends - Near Mint
1\tStar Wars Unlimited - Homeworlds - Leia Organa - These Are My Friends - Near Mint
4\tUniVersus - UniVersus: My Hero Academia - Capabilities - Near Mint 1st Edition Normal
`;

describe('parseReceipt', () => {
  it('reads totals, sellers and card lines', () => {
    const r = parseReceipt(RECEIPT);
    expect(r.grandTotal).toBe(102195);
    expect(r.tax).toBe(1523);
    expect(r.sellers).toEqual([
      { seller: 'Alpha Cards', total: 610, orderNumber: 'AAAA1111-BBBB22-CCC33' },
      { seller: 'Beta Games TCG', total: 513, orderNumber: 'DDDD4444-EEEE55-FFF66' },
    ]);
    expect(r.cards).toHaveLength(4);
    expect(r.cards[0]).toMatchObject({ qty: 2, game: 'Dragon Ball Super Fusion World', set: 'Awakened Pulse', name: 'Ginyu - FB01-104', condition: 'Near Mint Holofoil' });
  });

  it('handles Windows line endings and space-separated quantities', () => {
    const r = parseReceipt(RECEIPT.replace(/\n/g, '\r\n').replace(/\t/g, ' '));
    expect(r.sellers).toHaveLength(2);
    expect(r.cards).toHaveLength(4);
    expect(r.cards[3].qty).toBe(4);
  });

  it('splits names that contain dashes', () => {
    expect(splitDescription('Star Wars Unlimited - Twin Suns - Tribunal - Grave of the 32nd - Near Mint')).toMatchObject({
      set: 'Twin Suns',
      name: 'Tribunal - Grave of the 32nd',
      condition: 'Near Mint',
    });
  });

  it('parses money', () => {
    expect(cents('$1,234.5')).toBe(123450);
    expect(cents('$4')).toBe(400);
  });
});

describe('importing and tracking', () => {
  it('skips sellers already imported', () => {
    const d = newData();
    expect(importReceipt(d, parseReceipt(RECEIPT)).added).toBe(2);
    const again = importReceipt(d, parseReceipt(RECEIPT));
    expect(again).toMatchObject({ added: 0, duplicates: 2 });
    expect(d.packages).toHaveLength(2);
    expect(d.cards).toHaveLength(4);
  });

  it('moves packages through shipped and delivered', () => {
    const d = newData();
    importReceipt(d, parseReceipt(RECEIPT));
    const p = d.packages[0];
    expect(statusOf(p)).toBe('waiting');
    setDelivered(p, true);
    expect(statusOf(p)).toBe('delivered');
    expect(p.shippedOn).toBe(p.deliveredOn);
    setShipped(p, false);
    expect(statusOf(p)).toBe('waiting');
  });

  it('tags cards with the envelope being unpacked and reports problems by seller', () => {
    const d = newData();
    importReceipt(d, parseReceipt(RECEIPT));
    const [a, b] = d.packages;
    setDelivered(a, true);
    toggleCard(d.cards[0], a);
    expect(d.cards[0]).toMatchObject({ got: 2, packageId: a.id });
    d.cards[1].problem = 'wrong';
    d.cards[1].packageId = a.id;
    const r = buildReport(d);
    expect(r.late).toEqual([]);
    expect(r.unshipped).toEqual([b]);
    expect(r.bySeller[0].cards).toEqual([d.cards[1]]);
    expect(r.notReceived).toHaveLength(2);
    const text = reportText(r);
    expect(text).toContain('Alpha Cards · Order AAAA1111-BBBB22-CCC33');
    expect(text).toContain('Wrong card: 1× Star Wars Unlimited');
    expect(text).toContain('CARDS NOT CHECKED OFF YET (5)');
    expect(text).toContain('NOT SHIPPED YET (1)');
  });
});
