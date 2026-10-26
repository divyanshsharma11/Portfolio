// Clicking or tapping the core also gives its canvas keyboard focus. That focus must not run the keyboard
// "select the first item" step, or it overrides what was just pointed at and the first click opens About.
// Browsers deliver pointer-caused focus right around the press/release (touch can lag a little), so focus that
// arrives shortly after a pointer event is treated as coming from the pointer, not from Tab.
export const POINTER_FOCUS_WINDOW_MS = 600

export const isPointerFocus = (now: number, lastPointerAt: number) => now - lastPointerAt < POINTER_FOCUS_WINDOW_MS
