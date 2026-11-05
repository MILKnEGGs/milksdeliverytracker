<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import PackageSheet from '../components/PackageSheet.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { ago, counts, money, setDelivered, setShipped, shortDate, statusOf } from '../lib/data';
  import { app, go, save, toast, ui } from '../lib/store.svelte';
  import type { Package, PackageStatus } from '../lib/types';

  let q = $state('');
  let open = $state<Package | undefined>();

  const n = $derived(counts(app.d));
  const total = $derived(app.d.packages.length);
  const shown = $derived(app.d.packages.filter((p) => !q.trim() || `${p.seller} ${p.orderNumber}`.toLowerCase().includes(q.trim().toLowerCase())));

  // Still to come at the top: what's on the way first, then what hasn't shipped. Arrived ones sink and fade.
  const GROUPS: { status: PackageStatus; title: string; emoji: string }[] = [
    { status: 'shipped', title: 'On the way', emoji: '🚚' },
    { status: 'waiting', title: 'Not shipped yet', emoji: '📭' },
    { status: 'delivered', title: 'Arrived', emoji: '📬' },
  ];
  const groups = $derived(GROUPS.map((g) => ({ ...g, pkgs: shown.filter((p) => statusOf(p) === g.status) })).filter((g) => g.pkgs.length));

  function toggleShipped(p: Package) {
    setShipped(p, !p.shippedOn);
    save();
    navigator.vibrate?.(10);
  }

  function toggleArrived(p: Package) {
    const arriving = !p.deliveredOn;
    setDelivered(p, arriving);
    save();
    navigator.vibrate?.(10);
    if (arriving)
      toast(`${p.seller} arrived 📬`, {
        label: 'Check off cards',
        run: () => {
          ui.unpacking = p.id;
          go('cards');
        },
      });
  }

  const sub = (p: Package): string => {
    const bits = [money(p.total)];
    if (p.deliveredOn) bits.push(`arrived ${shortDate(p.deliveredOn)}`);
    else if (p.shippedOn) bits.push(`shipped ${shortDate(p.shippedOn)} · ${ago(p.shippedOn)}`);
    return bits.join(' · ');
  };
</script>

<TopBar title="Packages" sub={total ? `${n.waiting + n.shipped} of ${total} still to come` : undefined}>
  {#if total}
    <a class="icon-btn" aria-label="Import another receipt" href="#/import"><Icon name="plus" /></a>
  {/if}
</TopBar>

<main class="page">
  {#if !total}
    <div class="empty">
      <span class="big-emoji">📦</span>
      <h2>No orders yet</h2>
      <p class="muted">Import your TCGplayer receipt and every seller becomes a package to watch for.</p>
      <a class="btn tomato" href="#/import">Import a receipt</a>
    </div>
  {:else}
    <div class="summary card">
      <div class="stats">
        <span><strong>{n.waiting}</strong> not shipped</span>
        <span><strong>{n.shipped}</strong> on the way</span>
        <span><strong>{n.delivered}</strong> arrived</span>
      </div>
      <div class="progress" aria-hidden="true"><div style="width:{(n.delivered / total) * 100}%"></div></div>
    </div>
    {#if total > 8}
      <div class="search" style="margin-top:-12px">
        <input class="input" type="search" placeholder="Find a seller or order number" bind:value={q} />
      </div>
    {/if}

    {#if !groups.length}
      <p class="muted hint">No seller matches “{q}”.</p>
    {/if}
    {#each groups as g (g.status)}
      <section class="group" class:all-done={g.status === 'delivered'}>
        <h3 class="ghead">
          <span>{g.emoji}</span>
          <span class="gname">{g.title}</span>
          <span class="gcount">{g.pkgs.length}</span>
        </h3>
        <ul class="rows">
          {#each g.pkgs as p (p.id)}
            <li class="row-item" class:done={g.status === 'delivered'}>
              <button class="tap" onclick={() => (open = p)}>
                <span class="txt">
                  <span class="nm">{p.seller}</span>
                  <span class="meta">{sub(p)}{#if p.note.trim()} · 📝{/if}</span>
                </span>
              </button>
              <div class="toggles">
                <button class="tg" class:on={!!p.shippedOn} aria-pressed={!!p.shippedOn} onclick={() => toggleShipped(p)}>
                  <Icon name="truck" size={20} /><span>Shipped</span>
                </button>
                <button class="tg" class:on={!!p.deliveredOn} aria-pressed={!!p.deliveredOn} onclick={() => toggleArrived(p)}>
                  <Icon name="box" size={20} /><span>Arrived</span>
                </button>
              </div>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
    <p class="muted small hint">Tap a seller for dates, notes and the order number.</p>
  {/if}
</main>

{#if open}
  <PackageSheet pkg={open} onclose={() => (open = undefined)} />
{/if}

<style>
  .summary {
    margin-bottom: 12px;
    display: grid;
    gap: 10px;
    padding: 12px 14px;
  }
  .stats {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 0.92rem;
    color: var(--muted);
  }
  .stats strong {
    display: block;
    font-size: 1.4rem;
    color: var(--text);
  }
  .toggles {
    flex: none;
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 8px 10px 8px 0;
  }
  .tg {
    display: grid;
    justify-items: center;
    gap: 1px;
    width: 64px;
    padding: 6px 0 5px;
    border: 1.5px solid var(--border);
    border-radius: 12px;
    background: var(--bg);
    color: var(--muted);
    font-size: 0.72rem;
    font-weight: 800;
    cursor: pointer;
  }
  .tg.on {
    background: var(--leaf);
    border-color: var(--leaf);
    color: var(--on-leaf);
  }
  .done .tg.on {
    background: var(--done-check);
    border-color: var(--done-check);
  }
</style>
