/**
 * Unit tests for WelcomeModal component
 *
 * NOTE: These tests are currently skipped due to @testing-library/svelte v5.2.8
 * compatibility issues with Svelte 5 runes ($props, $state).
 *
 * The WelcomeModal component will be tested via E2E tests instead.
 * When @testing-library/svelte adds full Svelte 5 support, these tests can be re-enabled.
 *
 * Tracking: Same issue as documented in PLAN.md for integration tests
 *
 * @module tests/unit/components/WelcomeModal
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import WelcomeModal from '../../../src/lib/components/WelcomeModal.svelte';
import * as sampleData from '../../../src/lib/sample-data';
import * as storage from '../../../src/lib/storage';

describe.skip('WelcomeModal', () => {
  let mockOnClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnClose = vi.fn();
    // Mock window.location.reload
    delete (window as Partial<Window>).location;
    window.location = { reload: vi.fn() } as unknown as Location;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should not be visible when open is false', () => {
      render(WelcomeModal, { props: { open: false, onclose: mockOnClose } });

      // Modal should not be in the document
      expect(screen.queryByText('Welcome to BroteinBuddy!')).not.toBeInTheDocument();
    });

    it('should be visible when open is true', () => {
      render(WelcomeModal, { props: { open: true, onclose: mockOnClose } });

      // Modal title should be visible
      expect(screen.getByText('Welcome to BroteinBuddy!')).toBeInTheDocument();
    });

    it('should display welcome message', () => {
      render(WelcomeModal, { props: { open: true, onclose: mockOnClose } });

      expect(screen.getByText(/Track your protein shake inventory with ease/)).toBeInTheDocument();
    });

    it('should display key features list', () => {
      render(WelcomeModal, { props: { open: true, onclose: mockOnClose } });

      expect(screen.getByText('Key Features:')).toBeInTheDocument();
      expect(screen.getByText(/Random flavor selection weighted by quantity/)).toBeInTheDocument();
      expect(screen.getByText(/Visual inventory grid/)).toBeInTheDocument();
      expect(screen.getByText(/Smart box prioritization/)).toBeInTheDocument();
      expect(screen.getByText(/Favorite flavor quick-pick/)).toBeInTheDocument();
    });

    it('should display CTA message', () => {
      render(WelcomeModal, { props: { open: true, onclose: mockOnClose } });

      expect(screen.getByText(/Get started by loading sample data/)).toBeInTheDocument();
    });
  });

  describe('Buttons', () => {
    it('should display Load Sample Data button', () => {
      render(WelcomeModal, { props: { open: true, onclose: mockOnClose } });

      const button = screen.getByRole('button', { name: 'Load Sample Data' });
      expect(button).toBeInTheDocument();
    });

    it('should display Start Fresh button', () => {
      render(WelcomeModal, { props: { open: true, onclose: mockOnClose } });

      const button = screen.getByRole('button', { name: 'Start Fresh' });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Load Sample Data Action', () => {
    it('should call generateSampleData when Load Sample Data is clicked', async () => {
      const generateSpy = vi.spyOn(sampleData, 'generateSampleData');
      const saveSpy = vi.spyOn(storage, 'saveState');

      render(WelcomeModal, { props: { open: true, onclose: mockOnClose } });

      const button = screen.getByRole('button', { name: 'Load Sample Data' });
      await userEvent.click(button);

      expect(generateSpy).toHaveBeenCalledOnce();
      expect(saveSpy).toHaveBeenCalledOnce();
    });

    it('should save generated sample data to storage', async () => {
      const mockSampleData = {
        version: 1,
        flavors: [{ id: 'test', name: 'Test', randomPool: 'caffeine-free' }],
        boxes: [],
        favoriteFlavorId: null,
        settings: {},
      };
      vi.spyOn(sampleData, 'generateSampleData').mockReturnValue(mockSampleData);
      const saveSpy = vi.spyOn(storage, 'saveState');

      render(WelcomeModal, { props: { open: true, onclose: mockOnClose } });

      const button = screen.getByRole('button', { name: 'Load Sample Data' });
      await userEvent.click(button);

      expect(saveSpy).toHaveBeenCalledWith(mockSampleData);
    });

    it('should call onclose after loading sample data', async () => {
      vi.spyOn(sampleData, 'generateSampleData');
      vi.spyOn(storage, 'saveState');

      render(WelcomeModal, { props: { open: true, onclose: mockOnClose } });

      const button = screen.getByRole('button', { name: 'Load Sample Data' });
      await userEvent.click(button);

      expect(mockOnClose).toHaveBeenCalledOnce();
    });

    it('should reload the page after loading sample data', async () => {
      vi.spyOn(sampleData, 'generateSampleData');
      vi.spyOn(storage, 'saveState');

      render(WelcomeModal, { props: { open: true, onclose: mockOnClose } });

      const button = screen.getByRole('button', { name: 'Load Sample Data' });
      await userEvent.click(button);

      expect(window.location.reload).toHaveBeenCalledOnce();
    });
  });

  describe('Start Fresh Action', () => {
    it('should call onclose when Start Fresh is clicked', async () => {
      render(WelcomeModal, { props: { open: true, onclose: mockOnClose } });

      const button = screen.getByRole('button', { name: 'Start Fresh' });
      await userEvent.click(button);

      expect(mockOnClose).toHaveBeenCalledOnce();
    });

    it('should not load any data when Start Fresh is clicked', async () => {
      const generateSpy = vi.spyOn(sampleData, 'generateSampleData');
      const saveSpy = vi.spyOn(storage, 'saveState');

      render(WelcomeModal, { props: { open: true, onclose: mockOnClose } });

      const button = screen.getByRole('button', { name: 'Start Fresh' });
      await userEvent.click(button);

      expect(generateSpy).not.toHaveBeenCalled();
      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('should not reload the page when Start Fresh is clicked', async () => {
      render(WelcomeModal, { props: { open: true, onclose: mockOnClose } });

      const button = screen.getByRole('button', { name: 'Start Fresh' });
      await userEvent.click(button);

      expect(window.location.reload).not.toHaveBeenCalled();
    });
  });

  describe('Modal Close', () => {
    it('should call onclose when modal close button is clicked', async () => {
      render(WelcomeModal, { props: { open: true, onclose: mockOnClose } });

      // Modal component has a close button (X)
      const closeButton = screen.getByLabelText('Close');
      await userEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledOnce();
    });
  });

  describe('Accessibility', () => {
    it('should have proper modal role', () => {
      render(WelcomeModal, { props: { open: true, onclose: mockOnClose } });

      // Modal component sets role="dialog"
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have descriptive button labels', () => {
      render(WelcomeModal, { props: { open: true, onclose: mockOnClose } });

      expect(screen.getByRole('button', { name: 'Load Sample Data' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Start Fresh' })).toBeInTheDocument();
    });
  });
});
