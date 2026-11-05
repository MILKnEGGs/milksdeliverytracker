<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import { cardCount, importReceipt, money, shortDate, today } from '../lib/data';
  import { parseReceipt } from '../lib/parse';
  import { app, go, save, toast } from '../lib/store.svelte';

  let text = $state('');
  let name = $state(`Order of ${shortDate(today())}`);
  let fileInput: HTMLInputElement;

  const parsed = $derived(text.trim() ? parseReceipt(text) : undefined);
  const sellerSum = $derived(parsed ? parsed.sellers.reduce((n, s) => n + s.total, 0) + (parsed.tax ?? 0) : 0);
  // The seller subtotals plus tax should equal the grand total; if not, part of the receipt didn't get copied.
  const adds = $derived(!parsed?.grandTotal || Math.abs(sellerSum - parsed.grandTotal) <= 1);
  const known = $derived(new Set(app.d.packages.map((p) => p.orderNumber)));
  const dupes = $derived(parsed ? parsed.sellers.filter((s) => known.has(s.orderNumber)).length : 0);

  async function pickFile(e: Event & { currentTarget: HTMLInputElement }) {
    const f = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (f) text = await f.text();
  }

  async function pasteClipboard() {
    try {
      text = await navigator.clipboard.readText();
    } catch {
      toast('Press and hold the box below and tap Paste.');
    }
  }

  function doImport() {
    const res = importReceipt(app.d, parsed!, name);
    save();
    if (!res.added) {
      toast('Already imported. Nothing new on this receipt.');
      return;
    }
    toast(res.duplicates ? `Added ${res.added} new sellers (skipped ${res.duplicates} already here)` : `Imported ${res.added} packages ✓`);
    go('', true);
  }
</script>

<TopBar title="Import a receipt" showBack />

<main class="page stack">
  <section class="card stack">
    <h3>1. Copy the receipt</h3>
    <p class="muted small" style="margin:0">
      On tcgplayer.com, open the order's <strong>Order Details</strong> page (the one that starts with “Grand Total” and lists each
      seller with an order number). Select all the text and copy it. A saved <strong>.txt</strong> of that page works too.
    </p>
  </section>

  <section class="card stack">
    <h3>2. Paste it here</h3>
    <div class="row">
      <button class="btn small" onclick={pasteClipboard}>📋 Paste</button>
      <button class="btn small" onclick={() => fileInput.click()}>📄 Choose a .txt file</button>
      <input bind:this={fileInput} type="file" accept=".txt,text/plain" hidden onchange={pickFile} />
    </div>
    <textarea class="input" rows="6" bind:value={text} placeholder="Order Details&#10;Grand Total: $…"></textarea>
  </section>

  {#if parsed}
    <section class="card stack">
      <h3>3. Check and import</h3>
      {#if !parsed.sellers.length}
        <p class="banner" style="margin:0">🤔 No sellers found. Make sure you copied the Order Details page, including the “Order Number:” lines.</p>
      {:else}
        <ul class="plain">
          <li><strong>{parsed.sellers.length}</strong> sellers (one package each)</li>
          <li><strong>{parsed.cards.length}</strong> card lines, <strong>{cardCount(parsed.cards)}</strong> cards in all</li>
          {#if parsed.grandTotal}<li>Grand total <strong>{money(parsed.grandTotal)}</strong>{#if adds}&nbsp;✓ adds up{/if}</li>{/if}
        </ul>
        {#if !adds}
          <p class="banner small" style="margin:0">
            ⚠️ The sellers add up to {money(sellerSum)} with tax, not {money(parsed.grandTotal)}. Some of the receipt may not have been copied.
          </p>
        {/if}
        {#if !parsed.cards.length}
          <p class="banner small" style="margin:0">⚠️ No cards found. Copy down to the end of the page, past “Qty Description”.</p>
        {/if}
        {#if dupes}
          <p class="banner small" style="margin:0">
            {dupes === parsed.sellers.length ? 'This receipt is already imported.' : `${dupes} of these sellers are already imported and will be skipped, along with the card list.`}
          </p>
        {/if}
        <label class="field">
          <span>Call this order</span>
          <input class="input" bind:value={name} />
        </label>
        <button class="btn tomato block" disabled={dupes === parsed.sellers.length} onclick={doImport}>Import {parsed.sellers.length - dupes} packages</button>
      {/if}
    </section>
  {/if}

  <p class="muted small hint">The receipt doesn't say which seller sent which card. That's fine: when an envelope arrives, tap <em>Check off cards</em> and the cards you tick are remembered as coming from it.</p>
</main>
