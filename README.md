# Milk's Delivery Tracker

A checklist for incoming TCGplayer packages. Import the receipt from an order's **Order Details** page and every seller
becomes a package to watch for:

- **Packages**: mark each seller's envelope *Shipped* and *Arrived* (dates are recorded). Still-to-come packages stay at the top.
- **Cards**: every card line from the receipt, grouped by set, with a check mark and a received count. TCGplayer's receipt
  doesn't say which seller sent which card, so when an envelope arrives tap *Check off cards*: what you tick is remembered
  as coming from that seller.
- **Problems**: flag cards as missing, wrong, damaged or in worse condition. The report groups them by seller with the order
  number, lists packages that haven't arrived, and copies or shares as plain text for a TCGplayer claim.

Everything stays on the device (IndexedDB). It works offline once opened, and installs to the Home Screen.

## Develop

```
npm.cmd install
npm.cmd run dev      # http://localhost:5173
npm.cmd test         # receipt parser and report tests
npm.cmd run build    # svelte-check + production build into dist/
```

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.
