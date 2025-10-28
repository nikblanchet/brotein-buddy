<script lang="ts">
  /**
   * Component Demo Page
   *
   * Interactive demonstration of all design system components.
   * Useful for visual testing, development, and documentation.
   */

  import Button from './components/Button.svelte';
  import Modal from './components/Modal.svelte';
  import NumberPad from './components/NumberPad.svelte';

  let modalOpen = $state(false);
  let selectedNumber: number | 'keyboard' | null = $state(null);
</script>

<div class="demo">
  <header class="demo-header">
    <h1>BroteinBuddy Component Library</h1>
    <p class="text-secondary">
      Interactive demo of design system components with various configurations
    </p>
  </header>

  <!-- Button Component -->
  <section class="demo-section">
    <h2>Button Component</h2>
    <p class="text-secondary">Versatile button component with multiple variants and sizes</p>

    <div class="demo-group">
      <h3>Variants</h3>
      <div class="flex gap-3">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
    </div>

    <div class="demo-group">
      <h3>Sizes</h3>
      <div class="flex gap-3 items-center">
        <Button size="sm">Small</Button>
        <Button size="base">Base</Button>
        <Button size="lg">Large</Button>
      </div>
    </div>

    <div class="demo-group">
      <h3>States</h3>
      <div class="flex gap-3">
        <Button variant="primary">Enabled</Button>
        <Button variant="primary" disabled>Disabled</Button>
      </div>
    </div>

    <div class="demo-group">
      <h3>Full Width</h3>
      <Button variant="primary" fullWidth>Full Width Button</Button>
    </div>

    <div class="demo-group">
      <h3>Interactive</h3>
      <Button variant="primary" onclick={() => (modalOpen = true)}>Open Modal</Button>
    </div>
  </section>

  <!-- Modal Component -->
  <section class="demo-section">
    <h2>Modal Component</h2>
    <p class="text-secondary">Accessible modal dialog with animations and focus management</p>

    <div class="demo-group">
      <h3>Sizes</h3>
      <div class="flex gap-3">
        <Button onclick={() => (modalOpen = true)}>Default Modal</Button>
      </div>
      <p class="text-sm text-secondary mt-2">
        Click "Open Modal" button above to see modal in action
      </p>
    </div>
  </section>

  <!-- NumberPad Component -->
  <section class="demo-section">
    <h2>NumberPad Component</h2>
    <p class="text-secondary">Touch-friendly number pad for quantity input (1-12)</p>

    <div class="demo-group">
      <h3>Default (1-12)</h3>
      <NumberPad
        onselect={(value) => {
          selectedNumber = value;
        }}
      />
      {#if selectedNumber !== null}
        <p class="mt-4 text-lg">
          Selected: <strong>{selectedNumber}</strong>
        </p>
      {/if}
    </div>

    <div class="demo-group">
      <h3>Disabled State</h3>
      <NumberPad disabled onselect={() => {}} />
    </div>
  </section>

  <!-- Design Tokens -->
  <section class="demo-section">
    <h2>Design Tokens</h2>
    <p class="text-secondary">CSS variables used throughout the design system</p>

    <div class="demo-group">
      <h3>Colors</h3>
      <div class="color-grid">
        <div class="color-swatch">
          <div class="color-box" style="background-color: var(--color-primary)"></div>
          <p class="text-sm">Primary</p>
        </div>
        <div class="color-swatch">
          <div class="color-box" style="background-color: var(--color-success)"></div>
          <p class="text-sm">Success</p>
        </div>
        <div class="color-swatch">
          <div class="color-box" style="background-color: var(--color-warning)"></div>
          <p class="text-sm">Warning</p>
        </div>
        <div class="color-swatch">
          <div class="color-box" style="background-color: var(--color-danger)"></div>
          <p class="text-sm">Danger</p>
        </div>
        <div class="color-swatch">
          <div class="color-box" style="background-color: var(--color-info)"></div>
          <p class="text-sm">Info</p>
        </div>
      </div>
    </div>

    <div class="demo-group">
      <h3>Typography</h3>
      <div class="flex flex-col gap-2">
        <p class="text-3xl">3XL - Heading</p>
        <p class="text-2xl">2XL - Subheading</p>
        <p class="text-xl">XL - Large</p>
        <p class="text-lg">LG - Emphasis</p>
        <p class="text-base">Base - Body</p>
        <p class="text-sm">SM - Caption</p>
        <p class="text-xs">XS - Fine Print</p>
      </div>
    </div>

    <div class="demo-group">
      <h3>Spacing</h3>
      <div class="flex flex-col gap-4">
        <div class="flex items-center gap-2">
          <div class="spacing-box" style="width: var(--space-1)"></div>
          <span class="text-sm">space-1 (4px)</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="spacing-box" style="width: var(--space-2)"></div>
          <span class="text-sm">space-2 (8px)</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="spacing-box" style="width: var(--space-4)"></div>
          <span class="text-sm">space-4 (16px)</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="spacing-box" style="width: var(--space-8)"></div>
          <span class="text-sm">space-8 (32px)</span>
        </div>
      </div>
    </div>
  </section>
</div>

<!-- Modal Instance -->
<Modal open={modalOpen} title="Example Modal" onclose={() => (modalOpen = false)} size="base">
  <p>
    This is an example modal dialog. It demonstrates the modal component with a title, content area,
    and footer actions.
  </p>
  <p class="mt-4">
    You can close this modal by clicking the close button, pressing Escape, or clicking outside the
    dialog.
  </p>

  <svelte:fragment slot="footer">
    <Button variant="secondary" onclick={() => (modalOpen = false)}>Cancel</Button>
    <Button
      variant="primary"
      onclick={() => {
        modalOpen = false;
        alert('Action confirmed!');
      }}
    >
      Confirm
    </Button>
  </svelte:fragment>
</Modal>

<style>
  .demo {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--space-8);
  }

  .demo-header {
    margin-bottom: var(--space-12);
    text-align: center;
  }

  .demo-header h1 {
    margin-bottom: var(--space-2);
  }

  .demo-section {
    margin-bottom: var(--space-12);
    padding: var(--space-6);
    background-color: var(--color-surface-100);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border-light);
  }

  .demo-section h2 {
    margin-bottom: var(--space-2);
  }

  .demo-section > p {
    margin-bottom: var(--space-6);
  }

  .demo-group {
    margin-bottom: var(--space-8);
  }

  .demo-group:last-child {
    margin-bottom: 0;
  }

  .demo-group h3 {
    margin-bottom: var(--space-4);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
  }

  .color-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: var(--space-4);
  }

  .color-swatch {
    text-align: center;
  }

  .color-box {
    width: 100%;
    height: 80px;
    border-radius: var(--radius-base);
    border: 2px solid var(--color-border-light);
    margin-bottom: var(--space-2);
  }

  .spacing-box {
    height: var(--space-8);
    background-color: var(--color-primary);
    border-radius: var(--radius-sm);
  }
</style>
