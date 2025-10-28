/**
 * Button Utilities
 *
 * Helper functions for the Button component, exported separately
 * for easier unit testing.
 */

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'base' | 'lg';
  disabled?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onclick?: (e: MouseEvent) => void;
}

/**
 * Generates the CSS class string for the button based on props
 *
 * @param variant - Button variant
 * @param size - Button size
 * @param fullWidth - Whether button is full width
 * @returns Space-separated CSS class string
 *
 * @example
 * ```ts
 * getButtonClasses('primary', 'lg', false)
 * // Returns: 'button button--primary button--lg'
 * ```
 */
export function getButtonClasses(
  variant: ButtonProps['variant'],
  size: ButtonProps['size'],
  fullWidth: boolean
): string {
  const classes = ['button'];

  // Variant classes
  classes.push(`button--${variant}`);

  // Size classes
  classes.push(`button--${size}`);

  // Full width
  if (fullWidth) {
    classes.push('button--full-width');
  }

  return classes.join(' ');
}
