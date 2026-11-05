<script lang="ts">
  // − n + with thumb-sized buttons, limited to min..max.
  let { value, onchange, min = 0, max, label = 'How many' }: { value: number; onchange: (n: number) => void; min?: number; max: number; label?: string } =
    $props();

  const set = (n: number) => onchange(Math.min(max, Math.max(min, n)));
</script>

<div class="stepper" role="group" aria-label={label}>
  <button type="button" aria-label="One fewer" disabled={value <= min} onclick={() => set(value - 1)}>−</button>
  <span class="n" aria-live="polite">{value}</span>
  <button type="button" aria-label="One more" disabled={value >= max} onclick={() => set(value + 1)}>+</button>
</div>

<style>
  .stepper {
    flex: none;
    display: inline-flex;
    align-items: center;
    border: 1.5px solid var(--border);
    border-radius: 14px;
    background: var(--bg);
  }
  button {
    width: 48px;
    height: 46px;
    border: 0;
    background: none;
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1;
    color: var(--leaf);
    cursor: pointer;
  }
  button:disabled {
    color: var(--border);
    cursor: default;
  }
  .n {
    min-width: 32px;
    text-align: center;
    font-size: 1.15rem;
    font-weight: 800;
  }
</style>
