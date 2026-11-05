<script lang="ts">
  // Small stroke icons, drawn inline so they work offline and follow the text color.
  const PATHS = {
    box: "M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Zm0 0L12 12l9-4.5M12 12v9",
    cards: "M8 4h10a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 18 20H8a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 8 4ZM4.5 7v11",
    alert: "M12 3.5 2.5 20h19L12 3.5ZM12 10v4.5M12 17.5h.01",
    truck: "M2.5 6h11v10h-11ZM13.5 9.5h4l3 3.5V16h-7M6.5 18.5a1.5 1.5 0 1 0 0-.01M17 18.5a1.5 1.5 0 1 0 0-.01",
    list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
    tag: 'M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Zm5-4.5h.01',
    store: 'M3 9l1.5-5h15L21 9M3 9h18M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M5 12v8h14v-8M10 20v-5h4v5',
    settings:
      'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
    share: 'M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6',
    more: 'M5 12h.01M12 12h.01M19 12h.01',
    grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
    plus: 'M12 5v14M5 12h14',
    back: 'M15 5l-7 7 7 7',
    sort: 'M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    pencil: 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4 4',
    x: 'M6 6l12 12M18 6 6 18',
    copy: 'M9 9h11v12H9ZM5 15H4V3h11v1',
    paste: 'M9 3h6v3H9ZM7 4.5H5V21h14V4.5h-2M9 12h6M9 16h4',
  } as const;

  let { name, size = 22, stroke = 2 }: { name: keyof typeof PATHS; size?: number; stroke?: number } = $props();
  // Dots need a heavier stroke to read as dots.
  const dots = $derived(name === 'more' || name === 'grip');
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={dots ? 3.2 : stroke}
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"><path d={PATHS[name]} /></svg>
