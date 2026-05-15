/**
 * Unit tests for the SyncStatusBadge display-mapping helpers.
 *
 * Covers every SyncStatus value against both pendingChanges flags so a
 * change to the label/variant mapping has to update an explicit case.
 *
 * @module tests/unit/components/sync-status-badge-utils
 */

import { describe, it, expect } from 'vitest';
import {
  syncBadgeLabel,
  syncBadgeVariant,
} from '../../../src/lib/components/sync-status-badge-utils.js';

describe('sync-status-badge-utils', () => {
  describe('syncBadgeLabel', () => {
    it('reports an in-flight push/pull', () => {
      expect(syncBadgeLabel('syncing', false)).toBe('Syncing…');
      expect(syncBadgeLabel('syncing', true)).toBe('Syncing…');
    });

    it('reports the offline state', () => {
      expect(syncBadgeLabel('offline', false)).toBe('Offline');
      expect(syncBadgeLabel('offline', true)).toBe('Offline');
    });

    it('reports a sync error', () => {
      expect(syncBadgeLabel('error', false)).toBe('Sync error');
    });

    it('prompts to resolve a pending conflict', () => {
      expect(syncBadgeLabel('conflict-pending', false)).toBe('Resolve conflict');
    });

    it('distinguishes saved from a queued push', () => {
      expect(syncBadgeLabel('saved', false)).toBe('Saved');
      expect(syncBadgeLabel('saved', true)).toBe('Pending…');
    });

    it('distinguishes a settled idle state from a queued push', () => {
      expect(syncBadgeLabel('idle', false)).toBe('Synced');
      expect(syncBadgeLabel('idle', true)).toBe('Pending…');
    });
  });

  describe('syncBadgeVariant', () => {
    it('maps in-flight and offline states to their own variants', () => {
      expect(syncBadgeVariant('syncing', false)).toBe('syncing');
      expect(syncBadgeVariant('offline', false)).toBe('offline');
    });

    it('maps error and conflict-pending to the attention variant', () => {
      expect(syncBadgeVariant('error', false)).toBe('error');
      expect(syncBadgeVariant('conflict-pending', false)).toBe('error');
    });

    it('maps resting states to ok, or pending when a push is queued', () => {
      expect(syncBadgeVariant('saved', false)).toBe('ok');
      expect(syncBadgeVariant('saved', true)).toBe('pending');
      expect(syncBadgeVariant('idle', false)).toBe('ok');
      expect(syncBadgeVariant('idle', true)).toBe('pending');
    });
  });
});
