// App state: the saved data, the hash route, saving and toasts.

import { newData, normalize } from './data';
import { loadData, saveData } from './db';
import type { Data } from './types';

export const app = $state<{ d: Data; loaded: boolean }>({ d: newData(), loaded: false });

/** Not saved: which envelope is being unpacked right now (cards ticked get tagged with it). */
export const ui = $state<{ unpacking?: string }>({});

export async function load(): Promise<void> {
  const stored = await loadData();
  if (stored) app.d = normalize(stored);
  app.loaded = true;
}

let timer: ReturnType<typeof setTimeout> | undefined;

/** Saves soon; debounced so typing in a field doesn't write on every keystroke. */
export function save(): void {
  clearTimeout(timer);
  timer = setTimeout(() => saveData(app.d).catch((err) => alert('Could not save: ' + err)), 150);
}

/** Replaces everything (backup import, erase). */
export async function replaceData(d: Data): Promise<void> {
  clearTimeout(timer);
  app.d = d;
  ui.unpacking = undefined;
  await saveData(d);
}

// Write any pending change before the app is closed or sent to the background.
addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && timer) {
    clearTimeout(timer);
    timer = undefined;
    saveData(app.d).catch(() => {});
  }
});

// ---------------------------------------------------------------------------------------------
// Routing

export interface Route {
  page: 'packages' | 'cards' | 'problems' | 'settings' | 'install' | 'import';
}

const PAGES: Route['page'][] = ['cards', 'problems', 'settings', 'install', 'import'];

function parse(hash: string): Route {
  const [page] = hash.replace(/^#\/?/, '').split('/');
  return { page: PAGES.includes(page as Route['page']) ? (page as Route['page']) : 'packages' };
}

export const router = $state({ route: parse(location.hash) });

addEventListener('hashchange', () => {
  router.route = parse(location.hash);
  scrollTo(0, 0);
});

export function go(path: string, replace = false): void {
  if (replace) {
    history.replaceState(null, '', '#/' + path);
    router.route = parse(location.hash);
    scrollTo(0, 0);
  } else location.hash = '#/' + path;
}

export function back(fallback = ''): void {
  if (history.length > 1) history.back();
  else go(fallback);
}

// ---------------------------------------------------------------------------------------------
// Toasts

export interface Toast {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

export const toasts = $state<Toast[]>([]);
let toastId = 0;

export function toast(text: string, action?: Toast['action'], ms = 5000): void {
  const t = { id: ++toastId, text, action };
  toasts.push(t);
  setTimeout(() => dismissToast(t.id), ms);
}

export function dismissToast(id: number): void {
  const i = toasts.findIndex((t) => t.id === id);
  if (i >= 0) toasts.splice(i, 1);
}

export const isStandalone =
  matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Copies text; false if the browser refused (then show it for copying by hand). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
