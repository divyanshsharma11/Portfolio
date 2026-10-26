// On phones a tooltip centred on a dot near the screen edge would be cut off. Keep its centre far enough from both
// edges that the whole tooltip stays inside the canvas. 124 = half of its 240px max width (see .tip in index.css)
// plus a 4px margin. A canvas too narrow to fit one gets it centred.
export const TIP_HALF_WIDTH = 124

export const clampTipX = (x: number, canvasWidth: number) =>
  canvasWidth > TIP_HALF_WIDTH * 2
    ? Math.min(Math.max(x, TIP_HALF_WIDTH), canvasWidth - TIP_HALF_WIDTH)
    : canvasWidth / 2
