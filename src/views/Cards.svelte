<script lang="ts">
  import { untrack } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import CardSheet from '../components/CardSheet.svelte';
  import Icon from '../components/Icon.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { cardCount, gameTag, groupCards, isDone, matches, money, packageOf, PROBLEMS, toggleCard } from '../lib/data';
  import { app, save, ui } from '../lib/store.svelte';
  import type { Card } from '../lib/types';

  type Filter = 'all' | 'todo' | 'envelope' | 'problems';

  let q = $state('');
  let filter = $state<Filter>(ui.unpacking ? 'todo' : 'all');
  let editing = $state<Card | undefined>();

  const unpacking = $derived(packageOf(app.d, ui.unpacking));
  const all = $derived(app.d.cards);
  const gotCount = $derived(all.reduce((n, c) => n + c.got, 0));
  const totalCount = $derived(cardCount(all));
  const fromEnvelope = $derived(unpacking ? all.filter((c) => c.packageId === unpacking.id) : []);

  // A card checked off while filtering "Still to check" stays visible until the filter or search changes,
  // so it doesn't jump out from under your thumb.
  const keep = new SvelteSet<string>();
  $effect(() => {
    void filter;
    void q;
    untrack(() => keep.clear());
  });

  const shown = $derived(
    all.filter((c) => {
      if (!matches(c, q.trim())) return false;
      if (filter === 'todo') return !isDone(c) || keep.has(c.id);
      if (filter === 'envelope') return c.packageId === unpacking?.id;
      if (filter === 'problems') return !!c.problem;
      return true;
    }),
  );
  const groups = $derived(groupCards(shown));

  function toggle(c: Card) {
    toggleCard(c, unpacking);
    if (filter === 'todo') keep.add(c.id);
    save();
    if (isDone(c)) navigator.vibrate?.(10);
  }

  function stopUnpacking() {
    ui.unpacking = undefined;
    if (filter === 'envelope') filter = 'all';
  }

  const meta = (c: Card): string => {
    const bits = [c.condition];
    if (c.got > 0 && c.got < c.qty) bits.push(`got ${c.got} of ${c.qty}`);
    const p = packageOf(app.d, c.packageId);
    if (p && p.id !== unpacking?.id) bits.push(p.seller);
    if (c.note.trim()) bits.push(c.note.trim());
    return bits.join(' · ');
  };
</script>

<TopBar title="Cards" sub={totalCount ? `${gotCount} of ${totalCount} checked off` : undefined} />

<main class="page">
  {#if !all.length}
    <div class="empty">
      <span class="big-emoji">🃏</span>
      <h2>No cards yet</h2>
      <p class="muted">Import a TCGplayer receipt and its cards show up here as a checklist.</p>
      <a class="btn tomato" href="#/import">Import a receipt</a>
    </div>
  {:else}
    <div class="search">
      {#if unpacking}
        <div class="banner unpack">
          <span class="txt small">
            <span>📬 Opening <strong>{unpacking.seller}</strong> · {money(unpacking.total)}</span>
            <span style="font-weight:600">Ticks count as from this envelope{fromEnvelope.length ? ` (${cardCount(fromEnvelope)} so far)` : ''}.</span>
          </span>
          <button class="btn small primary" onclick={stopUnpacking}>Done</button>
        </div>
      {/if}
      <input class="input" type="search" placeholder="Find a card (name, set, number)" bind:value={q} />
      <div class="chips scroll">
        <button class="chip" class:on={filter === 'all'} onclick={() => (filter = 'all')}>All</button>
        <button class="chip" class:on={filter === 'todo'} onclick={() => (filter = 'todo')}>Still to check</button>
        {#if unpacking}
          <button class="chip" class:on={filter === 'envelope'} onclick={() => (filter = 'envelope')}>This envelope</button>
        {/if}
        <button class="chip" class:on={filter === 'problems'} onclick={() => (filter = 'problems')}>Problems</button>
      </div>
    </div>

    {#if !groups.length}
      <p class="muted hint">
        {#if q.trim()}No card matches “{q}”.{:else if filter === 'todo'}🎉 Every card is checked off.{:else if filter === 'problems'}No problems flagged.{:else}Nothing ticked from this envelope yet.{/if}
      </p>
    {/if}

    {#each groups as g (g.key)}
      {@const gDone = g.cards.every(isDone)}
      <section class="group" class:all-done={gDone}>
        <h3 class="ghead">
          <span class="gname">{g.set || 'Other'}<span class="muted small" style="font-weight:700"> · {gameTag(g.game)}</span></span>
          <span class="gcount">{cardCount(g.cards.filter(isDone))}/{cardCount(g.cards)}</span>
        </h3>
        <ul class="rows">
          {#each g.cards as c (c.id)}
            {@const done = isDone(c)}
            <li class="row-item" class:done>
              <button class="tap" onclick={() => toggle(c)} aria-pressed={done}>
                <span class="check" class:part={!done && c.got > 0} aria-hidden="true">
                  {#if done}<Icon name="check" size={18} stroke={3} />{:else if c.got > 0}{c.got}{/if}
                </span>
                <span class="txt">
                  <span class="nm">{c.name}{#if c.qty > 1}<span class="qty">×{c.qty}</span>{/if}</span>
                  <span class="meta">
                    {#if c.problem}<span class="flag">{PROBLEMS[c.problem].emoji} {PROBLEMS[c.problem].label}</span>{/if}{meta(c)}
                  </span>
                </span>
              </button>
              <button class="edit" aria-label="Details for {c.name}" onclick={() => (editing = c)}><Icon name="pencil" size={19} /></button>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
    <p class="muted small hint">Tap a card to check off every copy. Tap ✎ to count copies one by one, pick the seller, or flag a problem.</p>
  {/if}
</main>

{#if editing}
  <CardSheet card={editing} onclose={() => (editing = undefined)} />
{/if}

<style>
  .unpack {
    flex-wrap: nowrap;
    padding: 8px 10px 8px 14px;
    background: color-mix(in srgb, var(--tomato) 16%, var(--surface));
  }
</style>
