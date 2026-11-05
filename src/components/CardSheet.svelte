<script lang="ts">
  import { PROBLEMS, statusOf } from '../lib/data';
  import { app, save } from '../lib/store.svelte';
  import type { Card, Problem } from '../lib/types';
  import Sheet from './Sheet.svelte';
  import Stepper from './Stepper.svelte';

  let { card, onclose }: { card: Card; onclose: () => void } = $props();

  // Arrived envelopes first: that's where a card usually came from.
  const packages = $derived(
    [...app.d.packages]
      .filter((p) => p.orderId === card.orderId)
      .sort((a, b) => Number(statusOf(b) === 'delivered') - Number(statusOf(a) === 'delivered') || a.seller.localeCompare(b.seller)),
  );

  function setGot(n: number) {
    card.got = n;
    save();
  }

  function setProblem(p: Problem | undefined) {
    card.problem = p;
    // A missing or wrong card means the right one never came, so don't count it as received.
    if ((p === 'missing' || p === 'wrong') && card.got === card.qty) card.got = Math.max(0, card.qty - 1);
    save();
  }
</script>

<Sheet label="Card details" {onclose}>
  <div class="stack">
    <div>
      <h2>{card.name}</h2>
      <p class="muted small" style="margin:4px 0 0">{card.game} · {card.set} · {card.condition}</p>
    </div>

    <div class="row">
      <span style="font-weight:700">Received</span>
      <span class="spacer"></span>
      <Stepper value={card.got} max={card.qty} onchange={setGot} label="How many received" />
      <span class="muted">of {card.qty}</span>
    </div>

    <label class="field">
      <span>Seller <span class="muted" style="font-weight:400">(the envelope it came in, or should have)</span></span>
      <select class="input" bind:value={card.packageId} onchange={save}>
        <option value={undefined}>Don't know yet</option>
        {#each packages as p (p.id)}
          <option value={p.id}>{p.seller}{statusOf(p) === 'delivered' ? '' : ' (not arrived)'}</option>
        {/each}
      </select>
    </label>

    <div class="field">
      <span style="font-weight:700;font-size:0.9rem">Anything wrong?</span>
      <div class="seg">
        <button class:on={!card.problem} onclick={() => setProblem(undefined)}>All good</button>
        {#each Object.entries(PROBLEMS) as [k, v] (k)}
          <button class:on={card.problem === k} onclick={() => setProblem(k as Problem)}>{v.emoji} {v.label}</button>
        {/each}
      </div>
    </div>

    <label class="field">
      <span>Note</span>
      <textarea class="input" rows="2" bind:value={card.note} oninput={save} placeholder="e.g. got the non-foil version"></textarea>
    </label>

    {#if card.problem && !card.packageId}
      <p class="banner small" style="margin:0">Pick the envelope it came from so the claim names the right seller.</p>
    {/if}

    <button class="btn primary block" onclick={onclose}>Done</button>
  </div>
</Sheet>

<style>
  .field {
    display: grid;
    gap: 6px;
  }
</style>
