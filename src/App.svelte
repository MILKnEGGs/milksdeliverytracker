<script lang="ts">
  import { registerSW } from 'virtual:pwa-register';
  import Icon from './components/Icon.svelte';
  import { buildReport } from './lib/data';
  import { requestPersistence } from './lib/db';
  import { app, dismissToast, isStandalone, router, toast, toasts } from './lib/store.svelte';
  import { setThemeMode } from './lib/theme';
  import Cards from './views/Cards.svelte';
  import Import from './views/Import.svelte';
  import Install from './views/Install.svelte';
  import Packages from './views/Packages.svelte';
  import Problems from './views/Problems.svelte';
  import Settings from './views/Settings.svelte';

  let updateReady = $state(false);
  let offlineReady = $state(false);
  const updateSW = registerSW({
    onNeedRefresh: () => (updateReady = true),
    onOfflineReady() {
      offlineReady = true;
      if (isStandalone) toast('✓ Ready to use offline', undefined, 4000);
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      if (registration.active) offlineReady = true;
      // Check for a new version hourly while the app stays open. Failures (no signal) are harmless.
      setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
    },
  });
  requestPersistence();

  $effect(() => setThemeMode(app.d.settings.theme));

  const flagged = $derived(app.d.cards.filter((c) => c.problem).length);
  const r = $derived(router.route);
  const TABS = [
    { page: 'packages', href: '#/', ico: 'box', label: 'Packages' },
    { page: 'cards', href: '#/cards', ico: 'cards', label: 'Cards' },
    { page: 'problems', href: '#/problems', ico: 'alert', label: 'Problems' },
    { page: 'settings', href: '#/settings', ico: 'settings', label: 'Settings' },
  ] as const;
  const showTabs = $derived(TABS.some((t) => t.page === r.page));
  // Keep the report fresh in the badge only when something is flagged.
  const badge = $derived(flagged ? flagged : buildReport(app.d).allDelivered && app.d.cards.some((c) => c.got < c.qty) ? '!' : '');
</script>

{#if r.page === 'cards'}
  <Cards />
{:else if r.page === 'problems'}
  <Problems />
{:else if r.page === 'settings'}
  <Settings {offlineReady} />
{:else if r.page === 'install'}
  <Install />
{:else if r.page === 'import'}
  <Import />
{:else}
  <Packages />
{/if}

{#if updateReady}
  <div class="update" role="status">
    <span>✨ A new version is ready.</span>
    <button class="btn small primary" onclick={() => updateSW(true)}>Update</button>
    <button class="btn small ghost" onclick={() => (updateReady = false)}>Later</button>
  </div>
{/if}

{#if showTabs}
  <nav class="tabbar">
    {#each TABS as t (t.page)}
      <a href={t.href} class:active={r.page === t.page} aria-current={r.page === t.page ? 'page' : undefined}>
        <span class="ico"><Icon name={t.ico} size={25} />{#if t.page === 'problems' && badge}<span class="badge-dot">{badge}</span>{/if}</span>{t.label}
      </a>
    {/each}
  </nav>
{/if}

<div class="toasts" aria-live="polite">
  {#each toasts as t (t.id)}
    <div class="toast">
      <span>{t.text}</span>
      {#if t.action}
        <button onclick={() => (t.action!.run(), dismissToast(t.id))}>{t.action.label}</button>
      {/if}
    </div>
  {/each}
</div>

<style>
  .update {
    position: fixed;
    left: 12px;
    right: 12px;
    top: calc(66px + env(safe-area-inset-top));
    z-index: 40;
    max-width: 616px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 16px;
    background: var(--surface);
    box-shadow: 0 8px 24px rgb(0 0 0 / 15%);
    font-weight: 800;
  }
  .update span {
    flex: 1;
  }
  .ico {
    position: relative;
    display: inline-grid;
  }
  .badge-dot {
    position: absolute;
    top: -4px;
    right: -10px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 9px;
    background: var(--tomato);
    color: var(--on-tomato);
    font-size: 0.7rem;
    line-height: 18px;
    text-align: center;
  }
</style>
