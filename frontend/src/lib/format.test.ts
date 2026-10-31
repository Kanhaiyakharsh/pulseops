import { describe, expect, it } from 'vitest';

import { formatDuration, formatLatency } from './format';

describe('formatLatency', () => {
  it('keeps one decimal below 10 ms and rounds above', () => {
    expect(formatLatency(4.26)).toBe('4.3 ms');
    expect(formatLatency(38.4)).toBe('38 ms');
  });
});

describe('formatDuration', () => {
  it('formats seconds, minutes, hours and days', () => {
    expect(formatDuration(42)).toBe('42s');
    expect(formatDuration(192)).toBe('3m 12s');
    expect(formatDuration(8_040)).toBe('2h 14m');
    expect(formatDuration(100_000)).toBe('1d 3h');
  });
});
