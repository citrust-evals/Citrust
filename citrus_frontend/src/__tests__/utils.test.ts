import { describe, it, expect } from 'vitest';
import { formatDuration, formatLatencyMs } from '../utils';

describe('formatDuration', () => {
  it('returns N/A for undefined', () => {
    expect(formatDuration(undefined)).toBe('N/A');
  });

  it('returns milliseconds rounded for values under 1 second', () => {
    expect(formatDuration(123.456789)).toBe('123ms');
    expect(formatDuration(999.999)).toBe('1000ms');
  });

  it('returns seconds with max 2 decimal places for values 1-60 seconds', () => {
    expect(formatDuration(1234.56789)).toBe('1.23s');
    expect(formatDuration(12345.6789)).toBe('12.35s');
    expect(formatDuration(1000)).toBe('1.00s');
    expect(formatDuration(59999)).toBe('60.00s');
  });

  it('returns minutes and seconds for values over 60 seconds', () => {
    expect(formatDuration(60000)).toBe('1m 0s');
    expect(formatDuration(90000)).toBe('1m 30s');
    expect(formatDuration(125000)).toBe('2m 5s');
  });
});

describe('formatLatencyMs', () => {
  it('returns 0 for undefined/null', () => {
    expect(formatLatencyMs(undefined)).toBe('0');
    expect(formatLatencyMs(null as any)).toBe('0');
  });

  it('formats integer values without decimals', () => {
    expect(formatLatencyMs(123)).toBe('123');
    expect(formatLatencyMs(0)).toBe('0');
  });

  it('formats decimal values with max 2 decimal places', () => {
    expect(formatLatencyMs(123.456789)).toBe('123.46');
    expect(formatLatencyMs(123.4)).toBe('123.4');
    expect(formatLatencyMs(123.45)).toBe('123.45');
  });

  it('removes trailing zeros from decimal', () => {
    expect(formatLatencyMs(123.10)).toBe('123.1');
    expect(formatLatencyMs(123.00)).toBe('123');
  });
});
