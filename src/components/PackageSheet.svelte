<script lang="ts">
  import { cardCount, cardsFrom, money, PROBLEMS, setDelivered, setShipped, statusOf } from '../lib/data';
  import { app, copyText, go, save, toast, ui } from '../lib/store.svelte';
  import type { Package } from '../lib/types';
  import Sheet from './Sheet.svelte';

  let { pkg, onclose }: { pkg: Package; onclose: () => void } = $props();

  const status = $derived(statusOf(pkg));
  const cards = $derived(cardsFrom(app.d, pkg));
  const flagged = $derived(cards.filter((c) => c.problem));

  function setStatus(s: 'waiting' | 'shipped' | 'delivered') {
    if (s === 'waiting') setShipped(pkg, false);
    else if (s === 'shipped') {
      pkg.deliveredOn = undefined;
      setShipped(pkg, true);
    } else setDelivered(pkg, true);
    save();
  }

  async function copyNumber() {
    toast((await copyText(pkg.orderNumber)) ? 'Order number copied ✓' : pkg.orderNumber);
  }

  function unpack() {
    if (statusOf(pkg) !== 'delivered') setDelivered(pkg, true);
    ui.unpacking = pkg.id;
    save();
    onclose();
    go('cards');
  }
</script>

<Sheet label="Package from {pkg.seller}" {onclose}>
  <div class="stack">
    <div>
      <h2>{pkg.seller}</h2>
      <div class="row" style="margin-top:4px">
        <span class="muted small">Order {pkg.orderNumber} · {money(pkg.total)}</span>
        <button class="btn small ghost" onclick={copyNumber}>Copy #</button>
      </div>
    </div>

    <div class="seg">
      <button class:on={status === 'waiting'} onclick={() => setStatus('waiting')}>📭 Not shipped</button>
      <button class:on={status === 'shipped'} onclick={() => setStatus('shipped')}>🚚 Shipped</button>
      <button class:on={status === 'delivered'} onclick={() => setStatus('delivered')}>📬 Arrived</button>
    </div>

    {#if pkg.shippedOn}
      <div class="dates">
        <label class="field">
          <span>Shipped on</span>
          <input class="input" type="date" bind:value={pkg.shippedOn} onchange={save} />
        </label>
        {#if pkg.deliveredOn}
          <label class="field">
            <span>Arrived on</span>
            <input class="input" type="date" bind:value={pkg.deliveredOn} onchange={save} />
          </label>
        {/if}
      </div>
    {/if}

    <button class="btn tomato block" onclick={unpack}>📬 Open it and check off cards</button>
    <p class="muted small" style="margin:-4px 0 0">Cards you tick next are remembered as coming from {pkg.seller}, so a claim names the right seller.</p>

    {#if cards.length}
      <div>
        <h3 style="margin-bottom:6px">From this envelope ({cardCount(cards)} cards)</h3>
        <ul class="plain small">
          {#each cards as c (c.id)}
            <li>
              {#if c.problem}<span class="flag">{PROBLEMS[c.problem].emoji} {PROBLEMS[c.problem].label}</span>{/if}
              {c.qty}× {c.name} <span class="muted">({c.set})</span>{#if c.got < c.qty}<span class="muted"> · got {c.got}</span>{/if}
            </li>
          {/each}
        </ul>
        {#if flagged.length}
          <a class="btn small" style="margin-top:10px" href="#/problems" onclick={onclose}>See the claim report</a>
        {/if}
      </div>
    {/if}

    <label class="field">
      <span>Note</span>
      <textarea class="input" rows="2" bind:value={pkg.note} oninput={save} placeholder="e.g. tracking number, envelope was torn"></textarea>
    </label>

    <button class="btn primary block" onclick={onclose}>Done</button>
  </div>
</Sheet>

<style>
  .dates {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
</style>
