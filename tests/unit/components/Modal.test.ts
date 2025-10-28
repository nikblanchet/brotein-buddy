/**
 * Unit tests for Modal component
 *
 * Tests the modal helper functions which handle close logic and styling.
 * We test the logic rather than rendering due to @testing-library/svelte
 * compatibility issues with Svelte 5.
 *
 * @see https://github.com/testing-library/svelte-testing-library/issues/296
 */

import { describe, it, expect } from 'vitest';
import {
  shouldCloseOnBackdrop,
  shouldCloseOnEscape,
  getModalSizeClass,
} from '../../../src/lib/components/modal-utils.js';

describe('Modal', () => {
  describe('shouldCloseOnBackdrop', () => {
    it('returns true when closeOnBackdrop is true and click is on backdrop', () => {
      expect(shouldCloseOnBackdrop(true, true)).toBe(true);
    });

    it('returns false when closeOnBackdrop is true but click is not on backdrop', () => {
      expect(shouldCloseOnBackdrop(true, false)).toBe(false);
    });

    it('returns false when closeOnBackdrop is false even if click is on backdrop', () => {
      expect(shouldCloseOnBackdrop(false, true)).toBe(false);
    });

    it('returns false when both closeOnBackdrop and isBackdropClick are false', () => {
      expect(shouldCloseOnBackdrop(false, false)).toBe(false);
    });
  });

  describe('shouldCloseOnEscape', () => {
    it('returns true when closeOnEscape is true and Escape key is pressed', () => {
      expect(shouldCloseOnEscape(true, 'Escape')).toBe(true);
    });

    it('returns false when closeOnEscape is true but different key is pressed', () => {
      expect(shouldCloseOnEscape(true, 'Enter')).toBe(false);
    });

    it('returns false when closeOnEscape is false even if Escape key is pressed', () => {
      expect(shouldCloseOnEscape(false, 'Escape')).toBe(false);
    });

    it('returns false for other keys when closeOnEscape is true', () => {
      const otherKeys = ['Tab', 'Space', 'Enter', 'a', 'A', '1'];

      otherKeys.forEach((key) => {
        expect(shouldCloseOnEscape(true, key)).toBe(false);
      });
    });

    it('is case-sensitive for Escape key', () => {
      expect(shouldCloseOnEscape(true, 'escape')).toBe(false);
      expect(shouldCloseOnEscape(true, 'ESCAPE')).toBe(false);
    });
  });

  describe('getModalSizeClass', () => {
    it('returns correct class for sm size', () => {
      expect(getModalSizeClass('sm')).toBe('modal-dialog--sm');
    });

    it('returns correct class for base size', () => {
      expect(getModalSizeClass('base')).toBe('modal-dialog--base');
    });

    it('returns correct class for lg size', () => {
      expect(getModalSizeClass('lg')).toBe('modal-dialog--lg');
    });

    it('returns correct class for full size', () => {
      expect(getModalSizeClass('full')).toBe('modal-dialog--full');
    });

    it('handles undefined size', () => {
      expect(getModalSizeClass(undefined)).toBe('modal-dialog--undefined');
    });
  });

  describe('integration scenarios', () => {
    it('backdrop click should close when both conditions are true', () => {
      const closeOnBackdrop = true;
      const isBackdropClick = true;

      expect(shouldCloseOnBackdrop(closeOnBackdrop, isBackdropClick)).toBe(true);
    });

    it('escape key should close when both conditions are true', () => {
      const closeOnEscape = true;
      const key = 'Escape';

      expect(shouldCloseOnEscape(closeOnEscape, key)).toBe(true);
    });

    it('modal should not close on backdrop click when disabled', () => {
      const closeOnBackdrop = false;
      const isBackdropClick = true;

      expect(shouldCloseOnBackdrop(closeOnBackdrop, isBackdropClick)).toBe(false);
    });

    it('modal should not close on escape when disabled', () => {
      const closeOnEscape = false;
      const key = 'Escape';

      expect(shouldCloseOnEscape(closeOnEscape, key)).toBe(false);
    });
  });
});
