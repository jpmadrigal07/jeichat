/**
 * Global UI scale — change these values (or env vars) to resize text, buttons,
 * and most spacing app-wide. Tailwind uses rem, so root font-size scales them together.
 *
 * Optional env (monorepo root `.env`):
 *   NEXT_PUBLIC_UI_SCALE=1          — default scale (desktop)
 *   NEXT_PUBLIC_UI_SCALE_MOBILE=1.25 — scale below mobile breakpoint
 *
 * Fixed pixel widths (e.g. w-[72px]) do not scale.
 */

const MOBILE_MAX_WIDTH_PX = 767;

function parseScale(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0.75 || parsed > 1.5) {
    return fallback;
  }
  return parsed;
}

export const UI_ROOT_FONT_PX = 16;

export const UI_SCALE_DESKTOP = parseScale(
  process.env.NEXT_PUBLIC_UI_SCALE,
  1,
);

export const UI_SCALE_MOBILE = parseScale(
  process.env.NEXT_PUBLIC_UI_SCALE_MOBILE,
  1.25,
);

export const UI_SCALE_MOBILE_MAX_WIDTH_PX = MOBILE_MAX_WIDTH_PX;

/** Inline CSS injected in root layout — keeps scaling in one config file. */
export function uiScaleCss(): string {
  return `
:root {
  --ui-scale: ${UI_SCALE_DESKTOP};
}
@media (max-width: ${UI_SCALE_MOBILE_MAX_WIDTH_PX}px) {
  :root {
    --ui-scale: ${UI_SCALE_MOBILE};
  }
}
html {
  font-size: calc(${UI_ROOT_FONT_PX}px * var(--ui-scale));
}
`.trim();
}
