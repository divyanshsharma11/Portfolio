// Breakpoints shared by the canvas layout and the React tree. index.css uses these exact media queries, and they are
// written in the form the production build ships (it rewrites range syntax into this). JS evaluates the same strings
// with matchMedia instead of comparing window.innerWidth, so CSS and JS go through the same parser and can't disagree,
// including at fractional widths (browser zoom / display scaling).
export const MQ_WIDE = '(min-width: 1280px)' // hero docked left at up to 780px, core beside it
export const MQ_MID = '(not (max-width: 900px)) and (not (min-width: 1280px))' // 900 < width < 1280: hero at MID_HERO_W
// 660 leaves the hero at least 600px inside (the side-by-side mapping's minimum) even when its scrollbar shows.
export const MID_HERO_W = 660

const wide = window.matchMedia(MQ_WIDE)
const mid = window.matchMedia(MQ_MID)

// Below both queries the hero overlays the whole screen and the core is a dimmed backdrop.
export const coreBesideHero = () => wide.matches || mid.matches

// Width an open panel takes on the right. It is min(600px, 100%) wide in CSS and covers the whole screen at <= 900px.
export const panelWidth = (w: number) => (coreBesideHero() ? Math.min(600, w) : 0)

// Width the hero takes on the left, or 0 when it overlays the whole screen.
export const heroWidth = (w: number) => (wide.matches ? Math.min(780, w * 0.5) : mid.matches ? MID_HERO_W : 0)
