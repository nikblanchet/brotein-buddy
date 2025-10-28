# Component Library

Comprehensive guide to BroteinBuddy's design system components.

## Table of Contents

- [Design System Overview](#design-system-overview)
- [Button Component](#button-component)
- [Modal Component](#modal-component)
- [NumberPad Component](#numberpad-component)
- [Design Tokens](#design-tokens)

## Design System Overview

The BroteinBuddy component library is built on a foundation of design tokens (CSS variables) for consistency and maintainability. All components:

- Use design tokens exclusively (no hardcoded values)
- Follow WCAG 2.1 Level AA accessibility standards
- Support light and dark modes automatically
- Are touch-friendly (44px minimum touch targets per iOS HIG)
- Include comprehensive unit tests

**Demo:** Run `npm run dev` to see interactive examples of all components.

## Button Component

Versatile button component with multiple variants, sizes, and states.

### Usage

```svelte
<script>
  import Button from '$lib/components/Button.svelte';
</script>

<Button variant="primary" size="lg" onclick={() => console.log('clicked')}>Click Me</Button>
```

### Props

| Prop        | Type                                              | Default     | Description                     |
| ----------- | ------------------------------------------------- | ----------- | ------------------------------- |
| `variant`   | `'primary' \| 'secondary' \| 'danger' \| 'ghost'` | `'primary'` | Visual style variant            |
| `size`      | `'sm' \| 'base' \| 'lg'`                          | `'base'`    | Button size                     |
| `disabled`  | `boolean`                                         | `false`     | Whether button is disabled      |
| `fullWidth` | `boolean`                                         | `false`     | Whether button spans full width |
| `type`      | `'button' \| 'submit' \| 'reset'`                 | `'button'`  | HTML button type                |
| `onclick`   | `(e: MouseEvent) => void`                         | -           | Click event handler             |

### Variants

- **primary**: Main call-to-action (blue background)
- **secondary**: Secondary action (outlined)
- **danger**: Destructive action (red background)
- **ghost**: Subtle action (transparent background)

### Sizes

- **sm**: Small (32px min height)
- **base**: Default (40px min height)
- **lg**: Large (48px min height, meets 44px touch target minimum)

### Examples

```svelte
<!-- Primary button -->
<Button variant="primary">Save</Button>

<!-- Danger button for destructive actions -->
<Button variant="danger" onclick={handleDelete}>Delete</Button>

<!-- Full-width button for mobile -->
<Button variant="primary" fullWidth>Continue</Button>

<!-- Disabled state -->
<Button variant="primary" disabled>Processing...</Button>
```

## Modal Component

Accessible modal dialog with backdrop, focus management, and smooth animations.

### Usage

```svelte
<script>
  import Modal from '$lib/components/Modal.svelte';
  import Button from '$lib/components/Button.svelte';

  let isOpen = $state(false);
</script>

<Button onclick={() => (isOpen = true)}>Open Modal</Button>

<Modal open={isOpen} title="Confirm Action" onclose={() => (isOpen = false)}>
  <p>Are you sure you want to continue?</p>

  {#snippet footer()}
    <Button variant="secondary" onclick={() => (isOpen = false)}>Cancel</Button>
    <Button variant="primary" onclick={handleConfirm}>Confirm</Button>
  {/snippet}
</Modal>
```

### Props

| Prop              | Type                               | Default  | Description                            |
| ----------------- | ---------------------------------- | -------- | -------------------------------------- |
| `open`            | `boolean`                          | -        | Whether modal is currently open        |
| `title`           | `string`                           | -        | Modal title (optional)                 |
| `onclose`         | `() => void`                       | -        | Callback when modal should close       |
| `closeOnBackdrop` | `boolean`                          | `true`   | Whether clicking backdrop closes modal |
| `closeOnEscape`   | `boolean`                          | `true`   | Whether Escape key closes modal        |
| `size`            | `'sm' \| 'base' \| 'lg' \| 'full'` | `'base'` | Modal size variant                     |

### Content (Svelte 5 Snippets)

The Modal component uses Svelte 5 snippets for content:

- **children**: Modal content area (default content, passed as children)
- **footer**: Optional footer area (typically for action buttons)

**Usage:**

```svelte
<Modal ...>
  <!-- Default content goes here -->
  <p>Modal body content</p>

  <!-- Footer snippet (optional) -->
  {#snippet footer()}
    <Button>Cancel</Button>
    <Button variant="primary">Confirm</Button>
  {/snippet}
</Modal>
```

### Sizes

- **sm**: Small (max-width: 400px)
- **base**: Default (max-width: 600px)
- **lg**: Large (max-width: 800px)
- **full**: Full screen on mobile, large on desktop

### Accessibility Features

- Automatic focus management (traps focus within modal)
- Returns focus to trigger element on close
- Escape key closes modal (configurable)
- ARIA attributes (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`)
- Body scroll prevention when open

### Examples

```svelte
<!-- Simple modal without title -->
<Modal open={isOpen} onclose={() => (isOpen = false)}>
  <p>Simple modal content</p>
</Modal>

<!-- Modal that cannot be closed by clicking backdrop -->
<Modal
  open={isOpen}
  title="Important Notice"
  onclose={() => (isOpen = false)}
  closeOnBackdrop={false}
>
  <p>This modal requires explicit action.</p>
</Modal>

<!-- Large modal -->
<Modal open={isOpen} title="Details" onclose={() => (isOpen = false)} size="lg">
  <p>Large modal for detailed content.</p>
</Modal>
```

## NumberPad Component

Touch-friendly number pad for entering quantities (1-12).

### Usage

```svelte
<script>
  import NumberPad from '$lib/components/NumberPad.svelte';

  let selectedValue = $state<number | 'keyboard' | null>(null);
</script>

<NumberPad
  onselect={(value) => {
    if (value === 'keyboard') {
      // Show keyboard input
    } else {
      // Use selected number
      selectedValue = value;
    }
  }}
/>
```

### Props

| Prop       | Type                                    | Default | Description                                 |
| ---------- | --------------------------------------- | ------- | ------------------------------------------- |
| `onselect` | `(value: number \| 'keyboard') => void` | -       | Callback when number or "keyboard" selected |
| `min`      | `number`                                | `1`     | Minimum number to display (inclusive)       |
| `max`      | `number`                                | `12`    | Maximum number to display (inclusive)       |
| `disabled` | `boolean`                               | `false` | Whether number pad is disabled              |

### Layout

- 3-column grid for numbers
- "Use Keyboard" button spans full width below grid
- Square buttons with 44px minimum touch targets
- Max-width: 400px

### Callback Values

- **number**: User tapped a number button (1-12)
- **'keyboard'**: User tapped "Use Keyboard" button

### Examples

```svelte
<!-- Default (1-12) -->
<NumberPad onselect={(value) => console.log(value)} />

<!-- Custom range (0-10) -->
<NumberPad min={0} max={10} onselect={(value) => console.log(value)} />

<!-- Disabled state -->
<NumberPad disabled onselect={(value) => console.log(value)} />
```

## Design Tokens

All components use CSS variables defined in `src/styles/variables.css`.

### Colors

```css
/* Primary */
--color-primary: #646cff;
--color-primary-hover: #535bf2;

/* Semantic */
--color-success: #22c55e;
--color-warning: #f59e0b;
--color-danger: #ef4444;
--color-info: #3b82f6;

/* Surfaces */
--color-surface-100: #ffffff; /* (dark: #1a1a1a) */
--color-surface-200: #f9f9f9; /* (dark: #242424) */

/* Text */
--color-text-primary: rgba(0, 0, 0, 0.87); /* (dark: rgba(255, 255, 255, 0.87)) */
```

### Typography

```css
/* Font Family */
--font-family-base: system-ui, Avenir, Helvetica, Arial, sans-serif;

/* Font Sizes */
--font-size-xs: 0.75rem; /* 12px */
--font-size-sm: 0.875rem; /* 14px */
--font-size-base: 1rem; /* 16px */
--font-size-lg: 1.125rem; /* 18px */
--font-size-xl: 1.25rem; /* 20px */
--font-size-2xl: 1.5rem; /* 24px */
--font-size-3xl: 2rem; /* 32px */

/* Font Weights */
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

### Spacing

```css
--space-1: 0.25rem; /* 4px */
--space-2: 0.5rem; /* 8px */
--space-3: 0.75rem; /* 12px */
--space-4: 1rem; /* 16px */
--space-6: 1.5rem; /* 24px */
--space-8: 2rem; /* 32px */
--space-12: 3rem; /* 48px */
```

### Border Radius

```css
--radius-sm: 4px;
--radius-base: 8px;
--radius-lg: 12px;
--radius-full: 9999px;
```

### Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-base: 0 1px 3px 0 rgb(0 0 0 / 0.1);
--shadow-lg: 0 4px 6px -1px rgb(0 0 0 / 0.1);
```

### Transitions

```css
--transition-fast: 150ms;
--transition-base: 250ms;
--transition-slow: 350ms;
--transition-timing: cubic-bezier(0.4, 0, 0.2, 1);
```

### Touch Targets

```css
--touch-target-min: 44px; /* iOS HIG minimum */
```

## Component Guidelines

### File Structure

- Components: `src/lib/components/ComponentName.svelte`
- Utilities: `src/lib/components/component-name-utils.ts`
- Tests: `tests/unit/components/ComponentName.test.ts`

### Design Principles

1. **Composable**: Small, focused components that do one thing well
2. **Accessible**: ARIA labels, keyboard navigation, focus management
3. **Themeable**: Use design tokens exclusively, no hardcoded colors
4. **Tested**: Unit tests for logic, E2E tests for integration
5. **Documented**: Comprehensive JSDoc with usage examples

### Props Pattern

- Use TypeScript interfaces for props
- Document all props in JSDoc and this guide
- Provide sensible defaults
- Use semantic prop names

### Event Handling

- Use `on:` directive for native events
- Use callback props for custom events (e.g., `onselect`)
- Prefix custom event props with `on`

### Styling

- Use scoped styles in `<style>` block
- Reference CSS variables for all design tokens
- Use utility classes for common patterns
- Avoid inline styles (use classes)

### Accessibility Checklist

- [ ] Semantic HTML elements
- [ ] ARIA roles and labels where needed
- [ ] Keyboard navigation support
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA
- [ ] Touch targets at least 44x44px

## Testing

All components have comprehensive unit tests for their utility functions. To run tests:

```bash
# Run all unit tests
npm run test:unit

# Run tests for specific component
npm run test:unit -- tests/unit/components/Button.test.ts

# Run tests in watch mode
npm run test:watch
```

## Further Reading

- [ADR-005: Design System](./adr/005-design-system.md) - Design decisions and rationale
- [Design Tokens Reference](../src/styles/variables.css) - Complete list of CSS variables
- [Component Demo](../src/lib/ComponentDemo.svelte) - Interactive examples
