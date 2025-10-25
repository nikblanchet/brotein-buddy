import { describe, it, expect } from 'vitest';

describe('Failing test for branch protection validation', () => {
  it('should fail to test branch protection', () => {
    // This test intentionally fails to verify that branch protection
    // blocks merging when CI fails
    expect(true).toBe(false);
  });
});
