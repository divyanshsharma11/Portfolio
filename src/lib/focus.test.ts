import { describe, expect, it } from 'vitest'
import { isPointerFocus, POINTER_FOCUS_WINDOW_MS } from './focus'

describe('isPointerFocus', () => {
  it('treats focus right after a mouse press as pointer focus (desktop click)', () => {
    expect(isPointerFocus(1001, 1000)).toBe(true)
  })

  it('treats focus that lags a tap by a few hundred ms as pointer focus (touch)', () => {
    expect(isPointerFocus(1000 + POINTER_FOCUS_WINDOW_MS - 1, 1000)).toBe(true)
  })

  it('treats focus long after the last pointer event as keyboard focus (Tab)', () => {
    expect(isPointerFocus(1000 + POINTER_FOCUS_WINDOW_MS, 1000)).toBe(false)
    expect(isPointerFocus(60_000, 1000)).toBe(false)
  })

  it('treats focus as keyboard focus when no pointer event has happened yet', () => {
    expect(isPointerFocus(5000, -Infinity)).toBe(false)
  })
})
