<script lang="ts">
  import CardSheet from '../components/CardSheet.svelte';
  import Icon from '../components/Icon.svelte';
  import PackageSheet from '../components/PackageSheet.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { buildReport, ago, cardCount, money, PROBLEMS, reportText, shortDate } from '../lib/data';
  import { app, copyText, toast } from '../lib/store.svelte';
  import type { Card, Package } from '../lib/types';

  let editingCard = $state<Card | undefined>();
  let openPkg = $state<Package | undefined>();
  let showUnchecked = $state(false);
  let showUnshipped = $state(false);
  let fallback = $state('');

  const r = $derived(buildReport(app.d));
  const text = $derived(reportText(r));
  const flaggedCount = $derived(r.bySeller.reduce((n, g) => n + g.cards.length, 0) + r.unassigned.length);

  async function copy() {
    if (await copyText(text)) toast('Report copied ✓ Paste it into your claim or a message.');
    else fallback = text;
  }

  async function share() {
    try {
      await navigator.share({ title: 'TCGplayer order problems', text });
    } catch (err) {
      if ((err as DOMException).name !== 'AbortError') copy();
    }
  }

  async function copyNumber(p: Package) {
    toast((await copyText(p.orderNumber)) ? `${p.seller}'s order number copied ✓` : p.orderNumber);
  }

  const canShare = typeof navigator.share === 'function';
</script>

<TopBar title="Problems" sub={app.d.packages.length ? `${flaggedCount} flagged · ${r.late.length + r.unshipped.length} not arrived` : undefined} />

<main class="page stack" style="gap:16px">
  {#if !app.d.packages.length}
    <div class="empty">
      <span class="big-emoji">🧾</span>
      <h2>Nothing to report</h2>
      <p class="muted">Once orders are imported, missing and wrong cards collect here, ready to copy into a TCGplayer claim.</p>
    </div>
  {:else}
    {#if r.allDelivered && !flaggedCount && !r.notReceived.length}
      <div class="card ok">🎉 Everything arrived and every card is checked off.</div>
    {/if}

    {#each r.bySeller as g (g.pkg.id)}
      <section class="card stack">
        <div>
          <h3>{g.pkg.seller}</h3>
          <div class="row">
            <span class="muted small">Order {g.pkg.orderNumber} · {money(g.pkg.total)}{g.pkg.deliveredOn ? ` · arrived ${shortDate(g.pkg.deliveredOn)}` : ''}</span>
            <button class="btn small ghost" onclick={() => copyNumber(g.pkg)}>Copy #</button>
          </div>
        </div>
        <ul class="rows inset">
          {#each g.cards as c (c.id)}
            <li class="row-item">
              <button class="tap" onclick={() => (editingCard = c)}>
                <span class="txt">
                  <span class="nm">{c.qty}× {c.name}</span>
                  <span class="meta"><span class="flag">{PROBLEMS[c.problem!].emoji} {PROBLEMS[c.problem!].label}</span>{c.set} · {c.condition}{c.note.trim() ? ` · ${c.note.trim()}` : ''}</span>
                </span>
              </button>
            </li>
          {/each}
        </ul>
      </section>
    {/each}

    {#if r.unassigned.length}
      <section class="card stack">
        <div>
          <h3>Flagged, seller not picked yet</h3>
          <p class="muted small" style="margin:4px 0 0">Tap one and choose the seller so the claim goes to the right order.</p>
        </div>
        <ul class="rows inset">
          {#each r.unassigned as c (c.id)}
            <li class="row-item">
              <button class="tap" onclick={() => (editingCard = c)}>
                <span class="txt">
                  <span class="nm">{c.qty}× {c.name}</span>
                  <span class="meta"><span class="flag">{PROBLEMS[c.problem!].emoji} {PROBLEMS[c.problem!].label}</span>{c.set} · {c.condition}</span>
                </span>
              </button>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if r.late.length}
      <section class="card stack">
        <h3>🚚 Shipped, not arrived ({r.late.length})</h3>
        <ul class="rows inset">
          {#each r.late as p (p.id)}
            <li class="row-item">
              <button class="tap" onclick={() => (openPkg = p)}>
                <span class="txt">
                  <span class="nm">{p.seller}</span>
                  <span class="meta">shipped {shortDate(p.shippedOn)} · {ago(p.shippedOn!)} · {money(p.total)}</span>
                </span>
              </button>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if r.unshipped.length}
      <section class="card stack">
        <div class="row">
          <h3 class="spacer">📭 Not shipped yet ({r.unshipped.length})</h3>
          {#if !showUnshipped}<button class="btn small" onclick={() => (showUnshipped = true)}>Show</button>{/if}
        </div>
        {#if showUnshipped}
          <ul class="rows inset">
            {#each r.unshipped as p (p.id)}
              <li class="row-item">
                <button class="tap" onclick={() => (openPkg = p)}>
                  <span class="txt">
                    <span class="nm">{p.seller}</span>
                    <span class="meta">Order {p.orderNumber} · {money(p.total)}</span>
                  </span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {/if}

    {#if r.notReceived.length}
      <section class="card stack">
        <div>
          <h3>{r.allDelivered ? '❓ Never received' : '🃏 Not checked off yet'} ({cardCount(r.notReceived)})</h3>
          <p class="muted small" style="margin:4px 0 0">
            {#if r.allDelivered}
              Every package has arrived, so these are missing. Tap one to pick the seller it should have come from and flag it.
            {:else}
              Normal while packages are still coming. Once everything has arrived, whatever is left here is missing.
            {/if}
          </p>
        </div>
        {#if showUnchecked || r.allDelivered}
          <ul class="rows inset">
            {#each r.notReceived as c (c.id)}
              <li class="row-item">
                <button class="tap" onclick={() => (editingCard = c)}>
                  <span class="txt">
                    <span class="nm">{c.qty}× {c.name}</span>
                    <span class="meta">{c.set} · {c.condition}{c.got ? ` · got ${c.got}` : ''}</span>
                  </span>
                </button>
              </li>
            {/each}
          </ul>
        {:else}
          <button class="btn small" onclick={() => (showUnchecked = true)}>Show them</button>
        {/if}
      </section>
    {/if}

    {#if fallback}
      <section class="card stack">
        <p class="muted small" style="margin:0">Couldn't copy automatically. Press and hold the text, Select All, then Copy:</p>
        <textarea class="input" readonly rows="8">{fallback}</textarea>
      </section>
    {/if}

    <p class="muted small hint">
      The report lists each problem with the seller and order number. To file a claim, find that order number in your TCGplayer order history.
    </p>
  {/if}
</main>

{#if app.d.packages.length}
  <div class="actionbar above-tabs">
    <div class="actionbar-inner">
      <button class="btn primary" style="flex:1" onclick={copy}><Icon name="copy" /> Copy report</button>
      {#if canShare}
        <button class="btn" onclick={share}><Icon name="share" /> Share</button>
      {/if}
    </div>
  </div>
{/if}

{#if editingCard}
  <CardSheet card={editingCard} onclose={() => (editingCard = undefined)} />
{/if}
{#if openPkg}
  <PackageSheet pkg={openPkg} onclose={() => (openPkg = undefined)} />
{/if}

<style>
  .inset {
    box-shadow: none;
    border: 1px solid var(--border);
    margin: 0 -4px;
  }
  .inset .tap {
    min-height: 50px;
  }
  .above-tabs {
    bottom: calc(62px + env(safe-area-inset-bottom));
    padding-bottom: 8px;
  }
  main {
    padding-bottom: calc(170px + env(safe-area-inset-bottom));
  }
</style>
