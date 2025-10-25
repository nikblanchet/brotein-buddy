import { describe, it, expect } from 'vitest';
import { capitalize, truncate } from '../../src/lib/utils/string';

describe('capitalize', () => {
  it('capitalizes the first letter of a string', () => {
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('world')).toBe('World');
  });

  it('handles already capitalized strings', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });

  it('handles empty strings', () => {
    expect(capitalize('')).toBe('');
  });

  it('handles single character strings', () => {
    expect(capitalize('a')).toBe('A');
    expect(capitalize('A')).toBe('A');
  });
});

describe('truncate', () => {
  it('truncates strings longer than maxLength', () => {
    expect(truncate('This is a long string', 10)).toBe('This is...');
  });

  it('does not truncate strings shorter than maxLength', () => {
    expect(truncate('Short', 10)).toBe('Short');
  });

  it('handles strings exactly at maxLength', () => {
    expect(truncate('Exact', 5)).toBe('Exact');
  });

  it('handles edge case with very short maxLength', () => {
    expect(truncate('Hello', 3)).toBe('...');
  });
});
