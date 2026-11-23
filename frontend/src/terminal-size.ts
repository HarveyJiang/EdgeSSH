// Terminal sizing rules.
//
// A phone-sized stage only fits ~45 columns, so xterm has to wrap almost every
// log line into two or three rows. The wide mode below keeps the grid at the
// classic 80 columns instead and lets `#terminal-stage` scroll sideways, which
// is what "swipe the SSH output left and right" means on a touch screen.

/** Columns kept even when the viewport is narrower (80 = classic terminal). */
export const MIN_TERMINAL_COLS = 80;

/**
 * Columns to request from the PTY: the fitted count normally, and no fewer than
 * `MIN_TERMINAL_COLS` while wide mode is on. The stage scrolls horizontally
 * whenever the grid ends up wider than its viewport.
 */
export function terminalColumns(fitCols: number, wide: boolean): number {
  const fitted = Math.max(1, Math.floor(fitCols));
  if (!Number.isFinite(fitted)) return MIN_TERMINAL_COLS;
  return wide ? Math.max(fitted, MIN_TERMINAL_COLS) : fitted;
}
