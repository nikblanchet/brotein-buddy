/**
 * Modal Utilities
 *
 * Helper functions for the Modal component, exported separately
 * for easier unit testing.
 */

export interface ModalProps {
  open: boolean;
  title?: string;
  onclose?: () => void;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  size?: 'sm' | 'base' | 'lg' | 'full';
}

/**
 * Determines if the modal should close based on backdrop click
 *
 * @param closeOnBackdrop - Whether backdrop clicks should close the modal
 * @param isBackdropClick - Whether the click was on the backdrop (not child)
 * @returns Whether the modal should close
 *
 * @example
 * ```ts
 * shouldCloseOnBackdrop(true, true) // true
 * shouldCloseOnBackdrop(true, false) // false
 * shouldCloseOnBackdrop(false, true) // false
 * ```
 */
export function shouldCloseOnBackdrop(closeOnBackdrop: boolean, isBackdropClick: boolean): boolean {
  return closeOnBackdrop && isBackdropClick;
}

/**
 * Determines if the modal should close based on keyboard event
 *
 * @param closeOnEscape - Whether Escape key should close the modal
 * @param key - The keyboard event key
 * @returns Whether the modal should close
 *
 * @example
 * ```ts
 * shouldCloseOnEscape(true, 'Escape') // true
 * shouldCloseOnEscape(true, 'Enter') // false
 * shouldCloseOnEscape(false, 'Escape') // false
 * ```
 */
export function shouldCloseOnEscape(closeOnEscape: boolean, key: string): boolean {
  return closeOnEscape && key === 'Escape';
}

/**
 * Gets the modal size class name
 *
 * @param size - The modal size variant
 * @returns The CSS class name for the size
 *
 * @example
 * ```ts
 * getModalSizeClass('sm') // 'modal-dialog--sm'
 * getModalSizeClass('base') // 'modal-dialog--base'
 * ```
 */
export function getModalSizeClass(size: ModalProps['size']): string {
  return `modal-dialog--${size}`;
}
