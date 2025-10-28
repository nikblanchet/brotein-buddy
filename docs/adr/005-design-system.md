# ADR 005: Design System and Component Library

**Status:** Accepted
**Date:** 2025-10-28
**Deciders:** Development Team
**Tags:** frontend, ui, design, components

## Context

As we begin implementing the user interface for BroteinBuddy (Phase 2), we need to establish a cohesive design system and component library. This system should provide:

1. **Consistent visual language** across all screens and components
2. **Reusable UI components** (Button, Modal, NumberPad) that serve as building blocks
3. **Design tokens** for colors, typography, spacing that ensure consistency
4. **Accessibility** standards for touch targets, keyboard navigation, screen readers
5. **Themeing** support for light and dark modes

The application is a mobile-first PWA targeting iOS devices, so the design system must prioritize touch-friendly interfaces and follow iOS Human Interface Guidelines where applicable.

## Decision

We will implement a **custom design system using CSS variables** for design tokens, with **scoped Svelte component styles** for component-specific styling.

### Key Decisions

#### 1. Styling Approach: CSS Variables (Not Tailwind)

**Decision:** Use vanilla CSS with CSS variables for design tokens, avoiding Tailwind CSS.

**Rationale:**

- **Consistency with existing codebase:** Phase 0 and Phase 1 established a pattern of minimal dependencies
- **Lightweight:** No additional build tools or large CSS bundles
- **Full control:** Complete control over bundle size, critical for PWA performance
- **Svelte-friendly:** Svelte's scoped styles work beautifully with CSS variables
- **Already established:** app.css already uses some custom CSS patterns

**Trade-offs:**

- More manual work compared to Tailwind's utility classes
- Need to establish our own design token system
- Less rapid prototyping compared to Tailwind

**Alternatives considered:**

- **Tailwind CSS:** Would enable faster development with pre-built utilities, but adds ~50KB to bundle and requires configuration. Rejected due to bundle size concerns for PWA.
- **CSS-in-JS:** Svelte already has scoped styles, adding CSS-in-JS would be redundant and increase bundle size.

#### 2. Color Palette: Keep Existing Blue Theme

**Decision:** Retain the existing blue primary color (#646cff) from the Vite/Svelte starter template.

**Rationale:**

- **Established foundation:** Already present in existing CSS
- **Professional appearance:** Blue is trustworthy, clean, and widely used in productivity apps
- **Good contrast:** Works well in both light and dark modes
- **Not distracting:** Protein shake-themed colors (brown, pink, etc.) could be visually distracting

**Trade-offs:**

- Less thematic than protein-shake colors
- More generic appearance

**Alternatives considered:**

- **Protein-shake themed:** Chocolate brown primary with vanilla/strawberry accents. Rejected as potentially too playful and distracting for a utility app.

#### 3. Design Token Structure

**Decision:** Define design tokens in `src/styles/variables.css` with the following categories:

1. **Colors:**
   - Primary: Blue (#646cff) with hover/active states
   - Semantic: Success (green), Warning (yellow), Danger (red), Info (blue)
   - Surfaces: Background levels (100-400)
   - Text: Primary, secondary, disabled, inverse
   - Borders: Light, medium, heavy

2. **Typography:**
   - Font family: System font stack
   - Size scale: xs (12px) through 3xl (32px)
   - Font weights: normal (400), medium (500), semibold (600), bold (700)
   - Line heights: tight (1.25), normal (1.5), relaxed (1.75)

3. **Spacing:**
   - Scale: 1 (4px) through 16 (64px) in increments that feel natural
   - Based on 4px grid for consistency

4. **Border Radius:**
   - sm (4px), base (8px), lg (12px), xl (16px), full (9999px)

5. **Shadows:**
   - sm through xl for elevation levels

6. **Transitions:**
   - Fast (150ms), base (250ms), slow (350ms)
   - Timing function: cubic-bezier for smooth easing

7. **Z-index:**
   - Predefined layers: dropdown, modal, popover, tooltip

8. **Touch Targets:**
   - Minimum 44px (iOS HIG guideline)

**Rationale:**

- Comprehensive coverage of all design needs
- Organized by category for easy discovery
- Follows common naming conventions (similar to Tailwind's approach)

#### 4. Dark Mode Support

**Decision:** Use CSS `prefers-color-scheme` media query to automatically switch themes based on system preference.

**Rationale:**

- **Automatic:** No user configuration needed
- **Standard:** Follows web platform conventions
- **Performance:** No JavaScript required, pure CSS

**Implementation:**

```css
:root {
  /* light mode tokens */
}

@media (prefers-color-scheme: dark) {
  :root {
    /* override with dark mode tokens */
  }
}
```

#### 5. Component Library Structure

**Decision:** Create three foundational components in Phase 2.1:

1. **Button.svelte:** Primary UI interaction element with variants (primary, secondary, danger, ghost) and sizes (sm, base, lg)
2. **Modal.svelte:** Overlay dialog with backdrop, focus management, and accessibility features
3. **NumberPad.svelte:** 1-12 grid for touch-friendly number entry

**Rationale:**

- These three components are used across multiple screens in Phase 2
- They establish patterns for future components
- They cover key interaction patterns: clicks (Button), overlays (Modal), data entry (NumberPad)

**Component Design Principles:**

1. **Composable:** Small, focused components that do one thing well
2. **Accessible:** ARIA labels, keyboard navigation, focus management
3. **Themeable:** Use design tokens exclusively, no hardcoded colors
4. **Tested:** Unit tests for logic, E2E tests for integration
5. **Documented:** Comprehensive JSDoc with usage examples

#### 6. Accessibility Standards

**Decision:** Follow WCAG 2.1 Level AA standards with iOS Human Interface Guidelines for touch targets.

**Requirements:**

- Minimum 44x44px touch targets (iOS HIG)
- Color contrast ratios meeting WCAG AA (4.5:1 for text)
- Keyboard navigation for all interactive elements
- Focus indicators visible and clear
- ARIA roles and labels where appropriate
- Screen reader support

#### 7. Testing Strategy

**Decision:** Unit tests for component logic (not rendering) due to @testing-library/svelte compatibility issues with Svelte 5.

**Approach:**

- Export helper functions (e.g., `getButtonClasses()`) for unit testing
- Test the helper functions thoroughly
- Defer component rendering tests until library compatibility is fixed (tracking in #3)
- E2E tests will cover full component integration

**Rationale:**

- @testing-library/svelte v5.2.8 has known issues with Svelte 5 runes
- Unit testing logic is still valuable even without rendering tests
- Follows pattern established in Phase 1

## Consequences

### Positive

1. **Consistency:** All components will use the same design tokens, ensuring visual consistency
2. **Maintainability:** Centralized design tokens make global changes easy
3. **Performance:** Lightweight CSS-only approach minimizes bundle size
4. **Accessibility:** Built-in accessibility standards from the start
5. **Dark mode:** Automatic theme switching with no configuration
6. **Developer experience:** Clear patterns and comprehensive documentation

### Negative

1. **Manual work:** More effort required compared to Tailwind's utilities
2. **Testing limitations:** Can't test component rendering until @testing-library/svelte compatibility is fixed
3. **Learning curve:** Developers need to learn our custom token system (though it follows common conventions)

### Risks and Mitigation

**Risk:** Design tokens might not cover all use cases
**Mitigation:** Tokens can be added incrementally as needs arise

**Risk:** CSS variables have older browser compatibility issues
**Mitigation:** All target browsers (modern iOS Safari) support CSS variables. Not a concern for PWA.

**Risk:** Manual CSS could lead to inconsistencies
**Mitigation:** ESLint rules, code review, and comprehensive documentation enforce standards

## Implementation Plan

### Phase 2.1.1: Design System Foundation (2 hours)

- Create `src/styles/variables.css` with all design tokens
- Create `src/styles/utilities.css` with common utility classes
- Update `src/app.css` to import and use design tokens
- Create this ADR (005-design-system.md)

### Phase 2.1.2: Button Component (1.5 hours)

- Create `src/lib/components/Button.svelte`
- Create `tests/unit/components/Button.test.ts`
- Export helper function for class generation

### Phase 2.1.3: Modal Component (2 hours)

- Create `src/lib/components/Modal.svelte` with fade animations
- Create `tests/unit/components/Modal.test.ts`
- Implement focus trap and ARIA attributes

### Phase 2.1.4: NumberPad Component (2 hours)

- Create `src/lib/components/NumberPad.svelte` (1-12 grid, no zero)
- Create `tests/unit/components/NumberPad.test.ts`
- Ensure 44px minimum touch targets

### Phase 2.1.5: Documentation (1 hour)

- Create `docs/components.md` with usage guide
- Update `DEVELOPING.md` with component guidelines
- Create demo page at `src/routes/demo.svelte`

## References

- [WCAG 2.1 Level AA](https://www.w3.org/WAI/WCAG21/quickref/?currentsidebar=%23col_overview&levels=aa)
- [iOS Human Interface Guidelines - Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [CSS Custom Properties (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [Svelte Scoped Styles](https://svelte.dev/docs/svelte-components#style)

## Related ADRs

- ADR-001: Technology Stack Selection (establishes Svelte + TypeScript + Vite)
- ADR-004: State Management Approach (Svelte stores pattern that components will use)

## Future Considerations

1. **Component expansion:** As Phase 2 progresses, we'll add more components (Card, Input, Select, etc.)
2. **Animation library:** Consider adding a lightweight animation library if fade transitions prove insufficient
3. **Tailwind migration:** If manual CSS becomes too burdensome, we can migrate to Tailwind in a future phase
4. **Design tokens in TypeScript:** Consider exporting design tokens as TypeScript constants for programmatic access
5. **Storybook:** Could add Storybook for component documentation and visual testing
