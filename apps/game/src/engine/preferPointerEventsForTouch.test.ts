import { describe, expect, it } from 'vite-plus/test';

import { deviceHasTouchInput, preferPointerEventsForTouch } from './preferPointerEventsForTouch';

describe('deviceHasTouchInput', () => {
  it('is true when the device reports touch points', () => {
    expect(deviceHasTouchInput(5, false)).toBe(true);
  });

  it('is true when the primary pointer is coarse', () => {
    expect(deviceHasTouchInput(0, true)).toBe(true);
  });

  it('is false for a mouse-only desktop', () => {
    expect(deviceHasTouchInput(0, false)).toBe(false);
  });
});

describe('preferPointerEventsForTouch', () => {
  it('flips isMobile.any for a spoofed desktop UA on a touchscreen', () => {
    const mobile = { any: false };
    expect(preferPointerEventsForTouch(mobile, true)).toBe(true);
    expect(mobile.any).toBe(true);
  });

  it('leaves a real desktop mouse unchanged', () => {
    const mobile = { any: false };
    expect(preferPointerEventsForTouch(mobile, false)).toBe(false);
    expect(mobile.any).toBe(false);
  });

  it('does not change an already-detected phone UA', () => {
    const mobile = { any: true };
    expect(preferPointerEventsForTouch(mobile, true)).toBe(false);
    expect(mobile.any).toBe(true);
  });
});
