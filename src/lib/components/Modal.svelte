<script lang="ts">
  /**
   * Modal Component
   *
   * An accessible modal dialog with backdrop, focus management, and smooth animations.
   * Follows WCAG 2.1 accessibility guidelines and supports keyboard navigation.
   *
   * @component
   * @example
   * ```svelte
   * <Modal open={isOpen} title="Confirm Action" onclose={() => setIsOpen(false)}>
   *   <p>Are you sure you want to continue?</p>
   *   <svelte:fragment slot="footer">
   *     <Button onclick={() => setIsOpen(false)}>Cancel</Button>
   *     <Button variant="primary" onclick={handleConfirm}>Confirm</Button>
   *   </svelte:fragment>
   * </Modal>
   * ```
   */

  interface ModalProps {
    /**
     * Whether the modal is currently open
     */
    open: boolean;

    /**
     * Modal title text (optional)
     * If provided, displays in the modal header
     */
    title?: string;

    /**
     * Callback when modal should close
     * Called when:
     * - User clicks backdrop (if closeOnBackdrop is true)
     * - User presses Escape key (if closeOnEscape is true)
     * - User clicks the close button
     */
    onclose?: () => void;

    /**
     * Whether clicking the backdrop closes the modal
     *
     * @default true
     */
    closeOnBackdrop?: boolean;

    /**
     * Whether pressing Escape key closes the modal
     *
     * @default true
     */
    closeOnEscape?: boolean;

    /**
     * Size variant of the modal
     * - sm: Small (max-width: 400px)
     * - base: Default (max-width: 600px)
     * - lg: Large (max-width: 800px)
     * - full: Full screen on mobile, large on desktop
     *
     * @default 'base'
     */
    size?: 'sm' | 'base' | 'lg' | 'full';
  }

  let {
    open = false,
    title,
    onclose,
    closeOnBackdrop = true,
    closeOnEscape = true,
    size = 'base',
  }: ModalProps = $props();

  let dialogElement: HTMLDivElement | null = null;
  let previouslyFocusedElement: HTMLElement | null = null;

  /**
   * Handles backdrop click events
   * Only closes modal if closeOnBackdrop is true and click target is the backdrop
   */
  function handleBackdropClick(event: MouseEvent) {
    if (closeOnBackdrop && event.target === event.currentTarget && onclose) {
      onclose();
    }
  }

  /**
   * Handles keyboard events for modal
   * Listens for Escape key to close modal
   */
  function handleKeydown(event: KeyboardEvent) {
    if (closeOnEscape && event.key === 'Escape' && onclose) {
      event.preventDefault();
      onclose();
    }
  }

  /**
   * Handles close button click
   */
  function handleCloseClick() {
    if (onclose) {
      onclose();
    }
  }

  /**
   * Sets up focus management when modal opens/closes
   */
  $effect(() => {
    if (open) {
      // Store currently focused element
      previouslyFocusedElement = document.activeElement as HTMLElement;

      // Focus the modal dialog
      if (dialogElement) {
        dialogElement.focus();
      }

      // Add keyboard listener
      document.addEventListener('keydown', handleKeydown);
    } else {
      // Return focus to previously focused element
      if (previouslyFocusedElement) {
        previouslyFocusedElement.focus();
        previouslyFocusedElement = null;
      }

      // Remove keyboard listener
      document.removeEventListener('keydown', handleKeydown);
    }

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  });

  /**
   * Prevent body scroll when modal is open
   */
  $effect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  });
</script>

{#if open}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-backdrop" onclick={handleBackdropClick} role="presentation">
    <!-- Modal Dialog -->
    <div
      bind:this={dialogElement}
      class="modal-dialog modal-dialog--{size}"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      tabindex="-1"
    >
      <!-- Header -->
      {#if title}
        <div class="modal-header">
          <h2 id="modal-title" class="modal-title">{title}</h2>
          <button
            type="button"
            class="modal-close"
            onclick={handleCloseClick}
            aria-label="Close modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      {:else}
        <button
          type="button"
          class="modal-close modal-close--no-title"
          onclick={handleCloseClick}
          aria-label="Close modal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      {/if}

      <!-- Content -->
      <div class="modal-content">
        <slot />
      </div>

      <!-- Footer (optional slot) -->
      {#if $$slots.footer}
        <div class="modal-footer">
          <slot name="footer" />
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  /**
   * Modal Backdrop
   * Full-screen overlay with semi-transparent background
   */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    z-index: var(--z-modal-backdrop);

    /* Animations */
    animation: fadeIn var(--transition-base) var(--transition-timing);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /**
   * Modal Dialog
   * The modal container
   */
  .modal-dialog {
    background-color: var(--color-surface-100);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    max-height: 90vh;
    width: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
    z-index: var(--z-modal);

    /* Animations */
    animation: slideIn var(--transition-base) var(--transition-timing);
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .modal-dialog:focus {
    outline: none;
  }

  /* Size variants */
  .modal-dialog--sm {
    max-width: 400px;
  }

  .modal-dialog--base {
    max-width: 600px;
  }

  .modal-dialog--lg {
    max-width: 800px;
  }

  .modal-dialog--full {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  @media (min-width: 768px) {
    .modal-dialog--full {
      max-width: 900px;
      max-height: 90vh;
      border-radius: var(--radius-lg);
    }
  }

  /**
   * Modal Header
   */
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-6);
    border-bottom: 1px solid var(--color-border-light);
  }

  .modal-title {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  /**
   * Close Button
   */
  .modal-close {
    background: none;
    border: none;
    padding: var(--space-2);
    cursor: pointer;
    color: var(--color-text-secondary);
    border-radius: var(--radius-base);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast) var(--transition-timing);
  }

  .modal-close:hover {
    background-color: var(--color-surface-300);
    color: var(--color-text-primary);
  }

  .modal-close:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .modal-close--no-title {
    position: absolute;
    top: var(--space-4);
    right: var(--space-4);
    z-index: 1;
  }

  /**
   * Modal Content
   */
  .modal-content {
    padding: var(--space-6);
    overflow-y: auto;
    flex: 1;
  }

  /**
   * Modal Footer
   */
  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-3);
    padding: var(--space-6);
    border-top: 1px solid var(--color-border-light);
  }
</style>
