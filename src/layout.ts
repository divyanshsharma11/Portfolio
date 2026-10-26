// Breakpoints shared by the canvas layout and the React tree. index.css uses these exact media queries, and they are
// written in the form the production build ships (it rewrites range syntax into this). JS evaluates the same strings
// with matchMedia instead of comparing window.innerWidth, so CSS and JS go through the same parser and can't disagree,
// including at fractional widths (browser zoom / display scaling).
export const MQ_WIDE = '(min-width: 1280px)' // hero docked left at 40% of the width (540-624px), core beside it
export const MQ_MID = '(not (max-width: 900px)) and (not (min-width: 1280px))' // 900 < width < 1280: hero at MID_HERO_W
// Beside the core, the data mapping (JSON + card) is drawn at 80% size (`zoom` on .map-grid in index.css, same number),
// so the hero column is 80% of the width the mapping needs at full size (660px incl. padding, 780px at most).
export const MID_HERO_W = 540
const HERO_MAX_W = 624

const wide = window.matchMedia(MQ_WIDE)
const mid = window.matchMedia(MQ_MID)

// Below both queries the hero overlays the whole screen and the core is a dimmed backdrop.
export const coreBesideHero = () => wide.matches || mid.matches

// Hero inner width from which the data mapping lays out side by side; narrower, it stacks. Full size it needs 600px,
// scaled to 80% beside the core it needs 480px.
export const mapMinWidth = () => (coreBesideHero() ? 480 : 600)

// Width an open panel takes on the right. It is min(600px, 100%) wide in CSS and covers the whole screen at <= 900px.
export const panelWidth = (w: number) => (coreBesideHero() ? Math.min(600, w) : 0)

// Width the hero takes on the left, or 0 when it overlays the whole screen.
export const heroWidth = (w: number) =>
  wide.matches ? Math.min(HERO_MAX_W, Math.max(w * 0.4, MID_HERO_W)) : mid.matches ? MID_HERO_W : 0
