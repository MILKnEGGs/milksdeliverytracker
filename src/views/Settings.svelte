<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import { backupJson, deleteOrder, money, newData, parseBackup } from '../lib/data';
  import { fileStamp, shareFile } from '../lib/files';
  import { app, isStandalone, replaceData, save, toast, ui } from '../lib/store.svelte';
  import type { Order, ThemeMode } from '../lib/types';

  let { offlineReady }: { offlineReady: boolean } = $props();

  let fileInput: HTMLInputElement;

  function setTheme(t: ThemeMode) {
    app.d.settings.theme = t;
    save();
  }

  const pkgCount = (o: Order) => app.d.packages.filter((p) => p.orderId === o.id).length;

  function rename(o: Order) {
    const n = prompt('Name this order', o.name)?.trim();
    if (n) {
      o.name = n;
      save();
    }
  }

  function remove(o: Order) {
    if (!confirm(`Delete “${o.name}” with its ${pkgCount(o)} packages and all their check marks?`)) return;
    deleteOrder(app.d, o.id);
    ui.unpacking = undefined;
    save();
    toast('Order deleted');
  }

  async function exportBackup() {
    const file = new File([backupJson($state.snapshot(app.d))], `deliveries-backup-${fileStamp()}.json`, { type: 'application/json' });
    await shareFile(file, "Milk's Delivery Tracker backup");
  }

  async function importBackup(e: Event & { currentTarget: HTMLInputElement }) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    try {
      const d = parseBackup(await file.text());
      const msg = `Replace everything on this device with this backup?\n\n${d.orders.length} orders, ${d.packages.length} packages, ${d.cards.length} card lines.\n\nWhat's here now will be replaced.`;
      if (!confirm(msg)) return;
      await replaceData(d);
      toast('Backup restored ✓');
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function eraseAll() {
    const typed = prompt("Erase ALL orders on this device? This can't be undone.\n\nType ERASE to confirm.");
    if (typed?.trim().toUpperCase() !== 'ERASE') return;
    await replaceData(newData());
    toast('Everything erased. Fresh start! 🌱');
  }
</script>

<TopBar title="Settings" />

<main class="page stack" style="gap:16px">
  <section class="card stack">
    <h3>🧾 Orders</h3>
    {#if app.d.orders.length}
      <div class="menu">
        {#each app.d.orders as o (o.id)}
          <div class="order">
            <span class="txt">
              <strong>{o.name}</strong>
              <span class="muted small">{pkgCount(o)} packages{o.grandTotal ? ` · ${money(o.grandTotal)}` : ''}</span>
            </span>
            <button class="btn small" onclick={() => rename(o)}>Rename</button>
            <button class="btn small danger" onclick={() => remove(o)}>Delete</button>
          </div>
        {/each}
      </div>
    {:else}
      <p class="muted small" style="margin:0">None yet.</p>
    {/if}
    <a class="btn" href="#/import">Import a receipt</a>
  </section>

  <section class="card stack">
    <h3>🎨 Look</h3>
    <div class="seg">
      <button class:on={app.d.settings.theme === 'auto'} onclick={() => setTheme('auto')}>Match device</button>
      <button class:on={app.d.settings.theme === 'light'} onclick={() => setTheme('light')}>☀️ Light</button>
      <button class:on={app.d.settings.theme === 'dark'} onclick={() => setTheme('dark')}>🌙 Dark</button>
    </div>
  </section>

  <section class="card stack">
    <h3>💾 Backup & move to another device</h3>
    <p class="muted small" style="margin:0">
      Everything is saved only on this device; nothing is sent anywhere. Export a backup to keep a copy or move to another device, then
      <em>Import</em> it there. Importing <strong>replaces</strong> what's on that device.
    </p>
    <div class="row">
      <button class="btn primary" onclick={exportBackup}>⬆️ Export backup</button>
      <button class="btn" onclick={() => fileInput.click()}>⬇️ Import backup</button>
      <input bind:this={fileInput} type="file" accept=".json,application/json" hidden onchange={importBackup} />
    </div>
  </section>

  <section class="card stack">
    <h3>📲 Install on your phone</h3>
    <p class="muted small" style="margin:0">
      {#if isStandalone}
        ✓ You're using the installed app{offlineReady ? ' and it works offline' : ''}.
      {:else}
        Add the app to your Home Screen so it opens like an app and works with no signal.
      {/if}
    </p>
    <a class="btn" href="#/install">How to install</a>
  </section>

  <section class="card stack">
    <h3>Danger zone</h3>
    <button class="btn danger" onclick={eraseAll}>Erase everything on this device</button>
  </section>

  <p class="muted small" style="text-align:center">Milk's Delivery Tracker v{__APP_VERSION__} · made with 💚 · <a href="https://milkneggs.github.io/pitch/milksdeliverytracker.html" target="_blank" rel="noopener">See what it does</a></p>
</main>

<style>
  .order {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
  }
  .order .txt {
    flex: 1;
    min-width: 0;
    display: grid;
  }
</style>
