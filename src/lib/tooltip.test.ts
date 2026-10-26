import { describe, expect, it } from 'vitest'
import { clampTipX, TIP_HALF_WIDTH } from './tooltip'

describe('clampTipX', () => {
  it('leaves a tooltip alone when it already fits', () => {
    expect(clampTipX(200, 390)).toBe(200)
  })

  it('pulls a tooltip back from the right edge (the "Make.co…" case)', () => {
    expect(clampTipX(380, 390)).toBe(390 - TIP_HALF_WIDTH)
  })

  it('pulls a tooltip back from the left edge', () => {
    expect(clampTipX(5, 390)).toBe(TIP_HALF_WIDTH)
  })

  it('keeps the whole tooltip inside the canvas at both extremes', () => {
    const width = 390
    for (const x of [-50, 0, 40, 195, 350, 390, 500]) {
      const centre = clampTipX(x, width)
      expect(centre - TIP_HALF_WIDTH).toBeGreaterThanOrEqual(0)
      expect(centre + TIP_HALF_WIDTH).toBeLessThanOrEqual(width)
    }
  })

  it('centres the tooltip when the canvas is too narrow to hold it', () => {
    expect(clampTipX(10, 200)).toBe(100)
  })
})
