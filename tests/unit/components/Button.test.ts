/**
 * Unit tests for Button component
 *
 * Tests the getButtonClasses helper function which generates CSS classes
 * based on the button's props. We test the logic rather than rendering
 * due to @testing-library/svelte compatibility issues with Svelte 5.
 *
 * @see https://github.com/testing-library/svelte-testing-library/issues/296
 */

import { describe, it, expect } from 'vitest';
import { getButtonClasses } from '../../../src/lib/components/button-utils.js';

describe('Button', () => {
  describe('getButtonClasses', () => {
    describe('variant classes', () => {
      it('applies primary variant class', () => {
        const result = getButtonClasses('primary', 'base', false);
        expect(result).toContain('button--primary');
      });

      it('applies secondary variant class', () => {
        const result = getButtonClasses('secondary', 'base', false);
        expect(result).toContain('button--secondary');
      });

      it('applies danger variant class', () => {
        const result = getButtonClasses('danger', 'base', false);
        expect(result).toContain('button--danger');
      });

      it('applies ghost variant class', () => {
        const result = getButtonClasses('ghost', 'base', false);
        expect(result).toContain('button--ghost');
      });

      it('always includes base button class', () => {
        const variants: Array<'primary' | 'secondary' | 'danger' | 'ghost'> = [
          'primary',
          'secondary',
          'danger',
          'ghost',
        ];

        variants.forEach((variant) => {
          const result = getButtonClasses(variant, 'base', false);
          expect(result).toContain('button');
        });
      });
    });

    describe('size classes', () => {
      it('applies small size class', () => {
        const result = getButtonClasses('primary', 'sm', false);
        expect(result).toContain('button--sm');
      });

      it('applies base size class', () => {
        const result = getButtonClasses('primary', 'base', false);
        expect(result).toContain('button--base');
      });

      it('applies large size class', () => {
        const result = getButtonClasses('primary', 'lg', false);
        expect(result).toContain('button--lg');
      });

      it('always includes base button class', () => {
        const sizes: Array<'sm' | 'base' | 'lg'> = ['sm', 'base', 'lg'];

        sizes.forEach((size) => {
          const result = getButtonClasses('primary', size, false);
          expect(result).toContain('button');
        });
      });
    });

    describe('full width modifier', () => {
      it('applies full-width class when fullWidth is true', () => {
        const result = getButtonClasses('primary', 'base', true);
        expect(result).toContain('button--full-width');
      });

      it('does not apply full-width class when fullWidth is false', () => {
        const result = getButtonClasses('primary', 'base', false);
        expect(result).not.toContain('button--full-width');
      });
    });

    describe('combined classes', () => {
      it('combines variant, size, and base classes correctly', () => {
        const result = getButtonClasses('primary', 'lg', false);
        expect(result).toBe('button button--primary button--lg');
      });

      it('combines all classes including full-width', () => {
        const result = getButtonClasses('secondary', 'sm', true);
        expect(result).toBe('button button--secondary button--sm button--full-width');
      });

      it('generates correct class string for danger variant with large size', () => {
        const result = getButtonClasses('danger', 'lg', false);
        expect(result).toBe('button button--danger button--lg');
      });

      it('generates correct class string for ghost variant with base size and full width', () => {
        const result = getButtonClasses('ghost', 'base', true);
        expect(result).toBe('button button--ghost button--base button--full-width');
      });
    });

    describe('class order consistency', () => {
      it('maintains consistent class order: base, variant, size, full-width', () => {
        const result = getButtonClasses('primary', 'lg', true);
        const classes = result.split(' ');

        expect(classes[0]).toBe('button');
        expect(classes[1]).toBe('button--primary');
        expect(classes[2]).toBe('button--lg');
        expect(classes[3]).toBe('button--full-width');
      });
    });

    describe('edge cases', () => {
      it('handles undefined size gracefully (treated as base)', () => {
        const result = getButtonClasses('primary', undefined as unknown as 'base', false);
        expect(result).toContain('button--undefined');
      });

      it('handles undefined variant gracefully', () => {
        const result = getButtonClasses(undefined as unknown as 'primary', 'base', false);
        expect(result).toContain('button--undefined');
      });
    });
  });
});
