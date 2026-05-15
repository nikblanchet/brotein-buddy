# Accessibility Checklist

This document provides a comprehensive checklist for ensuring all components in BroteinBuddy meet WCAG 2.1 AA accessibility standards.

## Target Standards

- **WCAG 2.1 Level AA** (primary target)
- **Lighthouse Accessibility Score:** 90+
- **Touch Targets:** Minimum 44x44px (iOS Human Interface Guidelines)

## General Requirements

### Semantic HTML

- [ ] Use semantic HTML5 elements (`<button>`, `<nav>`, `<main>`, `<header>`, `<footer>`)
- [ ] Proper heading hierarchy (`<h1>` → `<h2>` → `<h3>`, no skipping levels)
- [ ] Use `<button>` for actions, `<a>` for navigation
- [ ] Use `<form>` elements for form controls

### Color Contrast

- [ ] **Normal text:** Minimum 4.5:1 contrast ratio
- [ ] **Large text (18pt+ or 14pt bold+):** Minimum 3:1 contrast ratio
- [ ] **UI components and graphical objects:** Minimum 3:1 contrast ratio
- [ ] Test both light and dark modes

### Keyboard Navigation

- [ ] All interactive elements accessible via Tab key
- [ ] Logical tab order (top to bottom, left to right)
- [ ] Enter/Space activates buttons
- [ ] Escape closes modals and dialogs
- [ ] Arrow keys for custom navigation (lists, grids)
- [ ] No keyboard traps (user can navigate away)

### Focus Management

- [ ] Visible focus indicators on all interactive elements
- [ ] Focus indicators meet 3:1 contrast ratio
- [ ] Focus moves logically through interface
- [ ] Focus trapped within modals/dialogs
- [ ] Focus returns to trigger element when modal closes

### Touch Targets

- [ ] Minimum size: 44x44px (iOS HIG)
- [ ] Adequate spacing between targets (8px minimum)
- [ ] Buttons comfortable for thumb interaction
- [ ] No overlapping touch areas

## Component-Specific Requirements

### Button Component (`Button.svelte`)

- [x] Semantic `<button>` element
- [x] Visible focus indicators (`:focus-visible`)
- [x] Minimum 44px height
- [x] Disabled state properly conveyed
- [ ] `aria-label` when text is not descriptive
- [ ] `aria-pressed` for toggle buttons (if applicable)

### Modal Component (`Modal.svelte`)

- [x] `role="dialog"`
- [x] `aria-modal="true"`
- [x] `aria-labelledby` pointing to modal title
- [x] Focus trap implementation
- [x] Escape key closes modal
- [x] Backdrop click closes modal
- [ ] Focus returns to trigger on close
- [ ] Descriptive `aria-describedby` (optional)

### NumberPad Component (`NumberPad.svelte`)

- [x] Touch targets minimum 44x44px
- [x] Visible focus indicators
- [ ] Each button has `aria-label` describing its value
- [ ] "Use Keyboard" option accessible via keyboard
- [ ] Number grid navigable with arrow keys (future enhancement)

### Sync Status Badge (`SyncStatusBadge.svelte`)

- [x] Semantic `<button>` element
- [x] `aria-label` describing the current status and the tap action
- [x] `aria-haspopup="dialog"` (opens the Sync sheet)
- [x] `aria-live="polite"` on the status label so status changes are announced
- [x] Visible `:focus-visible` indicator
- [x] Status carried by the label text, not the colour dot alone

### Sync & Account Sheet (`SyncAccountModal.svelte`)

- [x] `role="dialog"` with `aria-modal="true"`
- [x] `aria-label` ("Sync and Account")
- [x] `aria-hidden` and `inert` toggled with the open state (the closed sheet is fully inert)
- [x] Email `<input>` wrapped in a visible `<label>`
- [x] Send-link result uses `role="status"`; errors use `role="alert"`
- [ ] Focus moves into the sheet on open and returns to the trigger on close

### Conflict Resolution Modal (`ConflictResolutionModal.svelte`)

- [x] `role="dialog"` and focus trap via the Modal component
- [x] Choice list uses `role="radiogroup"` with labelled radio options
- [x] Decision conveyed by text (box/event counts), not colour alone

### Home Screen (`Home.svelte`)

- [ ] Page title updates to "Home - BroteinBuddy"
- [ ] All buttons have descriptive text or `aria-label`
- [ ] Icon buttons include text alternatives
- [ ] Modal for flavor picker has proper ARIA attributes
- [ ] Flavor list items keyboard navigable

### Random Selection Flow (`Random.svelte`, `RandomConfirm.svelte`)

- [ ] Loading spinner has `role="status"` or `aria-live="polite"`
- [ ] Loading message announced to screen readers
- [ ] All action buttons properly labeled
- [ ] Alternative box information announced (aria-live or aria-describedby)
- [ ] Page titles update per screen

### Inventory Screen (`Inventory.svelte`)

- [ ] Page title updates to "Inventory - BroteinBuddy"
- [ ] Visual grid keyboard accessible (arrow key navigation)
- [ ] Table view fully keyboard navigable
- [ ] Sortable columns announced and keyboard accessible
- [ ] "New Flavor" modal properly labeled
- [ ] Empty state clearly conveyed

### Box Edit Screen (`InventoryBoxEdit.svelte`)

- [ ] Page title includes flavor name: "[Flavor] - Edit Box - BroteinBuddy"
- [ ] All form controls have visible `<label>` elements
- [ ] NumberPad inputs associated with labels (aria-labelledby)
- [ ] Validation errors announced with `aria-live="assertive"`
- [ ] Quantity display has semantic markup
- [ ] Location inputs properly labeled

### Rearrange Screen (`InventoryRearrange.svelte`)

- [ ] Page title updates to "Rearrange - BroteinBuddy"
- [ ] Drag-and-drop has keyboard alternative
- [ ] Draggable items have `aria-grabbed` (if using native drag)
- [ ] Drop zones clearly identified
- [ ] Changes announced via `aria-live` region
- [ ] Instructions provided for keyboard users

## Form Accessibility

### Labels and Inputs

- [ ] All `<input>`, `<select>`, `<textarea>` have associated `<label>`
- [ ] Labels use `for` attribute or wrap input
- [ ] Labels are visible (not hidden or placeholder-only)
- [ ] Placeholder text is not a substitute for labels
- [ ] Labels describe purpose, not format

### Validation and Errors

- [ ] Validation messages associated with inputs (aria-describedby)
- [ ] Error messages announced (aria-live="assertive")
- [ ] Errors have sufficient color contrast
- [ ] Errors use icon + text (not color alone)
- [ ] Required fields marked with `aria-required="true"` or `required`

### Form Structure

- [ ] Related fields grouped in `<fieldset>` with `<legend>`
- [ ] Logical tab order through form
- [ ] Submit button clearly identified
- [ ] Form can be submitted via Enter key

## ARIA Attributes

### Common ARIA Patterns

- [ ] `role` attributes used appropriately
- [ ] `aria-label` for elements without visible text
- [ ] `aria-labelledby` for associating elements
- [ ] `aria-describedby` for additional context
- [ ] `aria-hidden="true"` for decorative elements
- [ ] `aria-live` for dynamic content updates

### ARIA States

- [ ] `aria-expanded` for collapsible sections
- [ ] `aria-pressed` for toggle buttons
- [ ] `aria-current` for active navigation items
- [ ] `aria-disabled` for disabled elements
- [ ] `aria-invalid` for form validation errors

### ARIA Roles

- [ ] `role="navigation"` for nav elements
- [ ] `role="main"` for main content
- [ ] `role="dialog"` for modals
- [ ] `role="status"` for status updates
- [ ] `role="alert"` for important messages

## Dynamic Content

### Live Regions

- [ ] `aria-live="polite"` for non-urgent updates
- [ ] `aria-live="assertive"` for urgent messages
- [ ] `role="status"` for status updates
- [ ] `role="alert"` for errors and warnings
- [ ] Live regions present on page load (not injected)

### Loading States

- [ ] Loading indicators have `role="status"`
- [ ] Loading messages announced to screen readers
- [ ] Skeleton screens or placeholders clearly labeled
- [ ] Spinners include descriptive text (visually hidden if needed)

### Route Changes

- [ ] Page title updates on navigation
- [ ] Focus moves to main content on route change
- [ ] Route changes announced (consider aria-live)
- [ ] Browser back/forward work correctly

## Testing Procedures

### Automated Testing

- [ ] Run axe-core accessibility tests (npm run test:e2e)
- [ ] Zero violations on all routes
- [ ] WCAG 2.1 AA compliance verified

### Manual Testing

- [ ] Test with keyboard only (no mouse)
- [ ] Test with screen reader (VoiceOver on Mac/iOS)
- [ ] Test at 200% zoom level
- [ ] Test in light and dark modes
- [ ] Test on mobile device (iOS Safari)
- [ ] Test with browser accessibility extensions

### Assistive Technology Testing

- [ ] VoiceOver (macOS/iOS)
- [ ] NVDA (Windows)
- [ ] JAWS (Windows)
- [ ] Browser built-in readers

### Performance Testing

- [ ] Lighthouse accessibility audit: 90+ score
- [ ] No performance impact from accessibility features
- [ ] Keyboard navigation is performant (no lag)

## Common Issues to Avoid

### Anti-Patterns

- [ ] No `<div>` or `<span>` used as buttons (use `<button>`)
- [ ] No keyboard-only visibility (focus-visible, not focus)
- [ ] No custom controls without keyboard support
- [ ] No color-only information (use text/icons too)
- [ ] No auto-playing content without controls
- [ ] No time limits without way to extend
- [ ] No seizure-inducing animations (< 3 flashes/second)

### ARIA Misuse

- [ ] Don't use ARIA when HTML element exists
- [ ] Don't use `aria-label` on non-interactive elements
- [ ] Don't hide focusable content with `aria-hidden`
- [ ] Don't use `role` that conflicts with semantic HTML
- [ ] Don't create custom controls without full keyboard support

## Resources

### WCAG 2.1 Guidelines

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [Understanding WCAG 2.1](https://www.w3.org/WAI/WCAG21/Understanding/)
- [How to Meet WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)

### Testing Tools

- [axe DevTools Browser Extension](https://www.deque.com/axe/devtools/)
- [Lighthouse (Chrome DevTools)](https://developers.google.com/web/tools/lighthouse)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [Color Contrast Analyzer](https://www.tpgi.com/color-contrast-checker/)

### Documentation

- [MDN Web Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [W3C WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [iOS Human Interface Guidelines - Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Material Design - Accessibility](https://material.io/design/usability/accessibility.html)

## BroteinBuddy-Specific Notes

### Design System

- Touch targets: `--touch-target-min: 44px` (variables.css)
- Focus indicators: 2px solid with 3:1 contrast
- Dark mode: Automatic via `@media (prefers-color-scheme: dark)`

### Component Status

- **Button.svelte:** Mostly compliant (minor aria-label additions needed)
- **Modal.svelte:** Fully compliant (excellent implementation)
- **NumberPad.svelte:** Good touch targets, needs aria-labels
- **Routes:** Require page title updates and form labels

### Priority Issues

1. Add visible labels to all forms (InventoryBoxEdit)
2. Implement keyboard navigation for visual grid (Inventory)
3. Update page titles dynamically per route (App.svelte)
4. Add aria-live regions for dynamic updates
5. Verify color contrast meets 4.5:1 (especially text-secondary)
