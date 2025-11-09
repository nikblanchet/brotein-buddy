<script lang="ts">
  /**
   * Welcome Modal Component
   *
   * Displays a welcome message and feature overview for first-time users.
   * Offers two options: load sample data for a quick demo, or start fresh with an empty inventory.
   *
   * @component
   */

  import Modal from './Modal.svelte';
  import Button from './Button.svelte';
  import { generateSampleData } from '../sample-data';
  import { saveState } from '../storage';

  /**
   * Component props
   */
  interface Props {
    /**
     * Whether the modal is currently open
     */
    open: boolean;

    /**
     * Callback fired when the modal is closed
     */
    onclose: () => void;
  }

  let { open, onclose }: Props = $props();

  /**
   * Handle "Load Sample Data" button click
   * Populates the app with realistic demo data and closes the modal
   */
  function handleLoadSampleData() {
    try {
      const sampleData = generateSampleData();
      saveState(sampleData);
      onclose();
      // Reload the page to reflect the new data
      window.location.reload();
    } catch (error) {
      console.error('Failed to save sample data:', error);
      alert('Unable to save sample data. Your browser storage may be full.');
      // Don't close modal - let user try Start Fresh instead
    }
  }

  /**
   * Handle "Start Fresh" button click
   * Closes the modal and lets the user build their inventory from scratch
   */
  function handleStartFresh() {
    onclose();
  }
</script>

<Modal {open} title="Welcome to BroteinBuddy!" {onclose}>
  <div class="welcome-content">
    <p class="welcome-message">
      Track your protein shake inventory with ease. BroteinBuddy helps you manage flavors, boxes,
      and locations so you always know what you have in stock.
    </p>

    <div class="features">
      <h3>Key Features:</h3>
      <ul>
        <li>Random flavor selection weighted by quantity</li>
        <li>Visual inventory grid with drag-and-drop rearranging</li>
        <li>Smart box prioritization (open boxes first, lower quantities first)</li>
        <li>Favorite flavor quick-pick for your go-to choice</li>
      </ul>
    </div>

    <div class="cta-section">
      <p class="cta-message">Get started by loading sample data to explore, or start fresh:</p>
      <div class="actions">
        <Button variant="primary" size="lg" fullWidth={true} onclick={handleLoadSampleData}>
          Load Sample Data
        </Button>
        <Button variant="secondary" size="base" fullWidth={true} onclick={handleStartFresh}>
          Start Fresh
        </Button>
      </div>
    </div>
  </div>
</Modal>

<style>
  /**
   * Welcome Modal Content
   * Organized sections with clear hierarchy
   */
  .welcome-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    padding: var(--space-4);
  }

  .welcome-message {
    font-size: var(--font-size-base);
    line-height: 1.6;
    color: var(--color-text-primary);
    margin: 0;
  }

  /**
   * Features List
   */
  .features {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .features h3 {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    margin: 0;
  }

  .features ul {
    list-style-type: disc;
    padding-left: var(--space-6);
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .features li {
    font-size: var(--font-size-sm);
    line-height: 1.5;
    color: var(--color-text-secondary);
  }

  /**
   * Call-to-Action Section
   */
  .cta-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .cta-message {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    margin: 0;
    text-align: center;
  }

  /**
   * Action Buttons
   */
  .actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    width: 100%;
  }

  /**
   * Responsive Design
   * Larger text and spacing on bigger screens
   */
  @media (min-width: 768px) {
    .welcome-content {
      padding: var(--space-6);
    }

    .welcome-message {
      font-size: var(--font-size-lg);
    }

    .features li {
      font-size: var(--font-size-base);
    }
  }
</style>
