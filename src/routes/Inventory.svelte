<script lang="ts">
  /**
   * Inventory Management Screen
   *
   * Main inventory screen with visual stack view and table view toggle.
   * Provides two modes for viewing box inventory:
   * - Visual View: CSS Grid showing boxes stacked by physical location
   * - Table View: Sortable table with flavor, quantity, and location columns
   *
   * Users can tap boxes to edit them, navigate to rearrange screen,
   * or add new flavors via modal.
   *
   * @component
   */

  import Button from '$lib/components/Button.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import { push } from 'svelte-spa-router';
  import { ROUTES } from '$lib/router/routes';
  import { appState, addFlavor } from '$lib/stores';
  import type { Flavor } from '../types/models';
  import {
    groupBoxesByStack,
    getOutOfStockFlavors,
    sortBoxes,
    getFlavorColor,
    formatLocation,
    type SortColumn,
    type SortDirection,
  } from '$lib/inventory-utils';

  /**
   * View mode state
   * 'visual' = CSS Grid stack view
   * 'table' = Sortable table view
   */
  let viewMode = $state<'visual' | 'table'>('visual');

  /**
   * Modal state for adding new flavor
   */
  let isNewFlavorModalOpen = $state(false);
  let newFlavorName = $state('');
  let newFlavorExcludeFromRandom = $state(false);

  /**
   * Table sorting state
   * sortColumn: which column to sort by
   * sortDirection: 'asc' or 'desc'
   */
  let sortColumn = $state<SortColumn>('flavor');
  let sortDirection = $state<SortDirection>('asc');

  /**
   * Reactive: Get all boxes with their flavor information
   */
  let boxesWithFlavors = $derived(
    $appState.boxes.map((box) => {
      const flavor = $appState.flavors.find((f) => f.id === box.flavorId);
      return {
        box,
        flavor: flavor || null,
      };
    })
  );

  /**
   * Reactive: Group boxes by stack for visual view
   * Returns Map<stack, Box[]> sorted by height within each stack
   */
  let boxesByStack = $derived(() => groupBoxesByStack(boxesWithFlavors));

  /**
   * Reactive: Get flavors with zero inventory for out-of-stock section
   */
  let outOfStockFlavors = $derived(getOutOfStockFlavors($appState.flavors, $appState.boxes));

  /**
   * Reactive: Sorted table data based on current sort column and direction
   */
  let sortedTableData = $derived(() => sortBoxes(boxesWithFlavors, sortColumn, sortDirection));

  /**
   * Toggle between visual and table view
   */
  function toggleView() {
    viewMode = viewMode === 'visual' ? 'table' : 'visual';
  }

  /**
   * Navigate to individual box edit screen
   */
  function handleBoxClick(boxId: string) {
    push(ROUTES.INVENTORY_BOX_EDIT(boxId));
  }

  /**
   * Navigate to rearrange screen
   */
  function handleRearrangeClick() {
    push(ROUTES.INVENTORY_REARRANGE);
  }

  /**
   * Open new flavor modal
   */
  function handleNewFlavorClick() {
    newFlavorName = '';
    newFlavorExcludeFromRandom = false;
    isNewFlavorModalOpen = true;
  }

  /**
   * Close new flavor modal
   */
  function closeNewFlavorModal() {
    isNewFlavorModalOpen = false;
    newFlavorName = '';
    newFlavorExcludeFromRandom = false;
  }

  /**
   * Save new flavor
   */
  function handleSaveNewFlavor() {
    if (newFlavorName.trim() === '') {
      return;
    }

    // Generate a simple ID
    const flavorId = `flavor_${Date.now()}`;

    const newFlavor: Flavor = {
      id: flavorId,
      name: newFlavorName.trim(),
      excludeFromRandom: newFlavorExcludeFromRandom,
    };

    addFlavor(newFlavor);
    closeNewFlavorModal();
  }

  /**
   * Handle table column header click for sorting
   */
  function handleColumnClick(column: SortColumn) {
    if (sortColumn === column) {
      // Toggle direction if same column
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New column, default to ascending
      sortColumn = column;
      sortDirection = 'asc';
    }
  }
</script>

<div class="inventory-screen">
  <!-- Header with controls -->
  <header class="inventory-header">
    <h1>Inventory</h1>

    <div class="controls">
      <Button variant="ghost" size="base" onclick={toggleView}>
        View: {viewMode === 'visual' ? 'Visual' : 'Table'}
      </Button>
      <Button variant="secondary" size="base" onclick={handleRearrangeClick}>Rearrange</Button>
      <Button variant="primary" size="base" onclick={handleNewFlavorClick}>New Flavor</Button>
    </div>
  </header>

  <!-- Visual View -->
  {#if viewMode === 'visual'}
    <div class="visual-view">
      {#if boxesByStack().size === 0}
        <div class="empty-state">
          <p>No boxes in inventory</p>
          <p class="empty-hint">Add a new flavor to get started</p>
        </div>
      {:else}
        <div class="stacks-container">
          {#each [...boxesByStack().entries()] as [stackNum, boxes]}
            <div class="stack" data-stack={stackNum}>
              <div class="stack-label">Stack {stackNum}</div>
              <div class="stack-boxes">
                {#each boxes as { box, flavor }}
                  <!-- svelte-ignore a11y_click_events_have_key_events -->
                  <!-- svelte-ignore a11y_no_static_element_interactions -->
                  <div
                    class="box-visual"
                    class:box-open={box.isOpen}
                    style="background-color: {getFlavorColor(box.flavorId)};"
                    onclick={() => handleBoxClick(box.id)}
                  >
                    <div class="box-flavor">{flavor?.name || 'Unknown'}</div>
                    <div class="box-quantity">{box.quantity} bottles</div>
                    {#if box.isOpen}
                      <div class="box-status">Open</div>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Out of stock section -->
      {#if outOfStockFlavors.length > 0}
        <div class="out-of-stock-section">
          <h2>Out of Stock</h2>
          <div class="out-of-stock-list">
            {#each outOfStockFlavors as flavor}
              <div
                class="out-of-stock-item"
                style="border-left-color: {getFlavorColor(flavor.id)};"
              >
                {flavor.name}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Table View -->
  {#if viewMode === 'table'}
    <div class="table-view">
      {#if boxesWithFlavors.length === 0}
        <div class="empty-state">
          <p>No boxes in inventory</p>
          <p class="empty-hint">Add a new flavor to get started</p>
        </div>
      {:else}
        <table class="inventory-table">
          <thead>
            <tr>
              <th
                class="sortable"
                class:sorted={sortColumn === 'flavor'}
                onclick={() => handleColumnClick('flavor')}
              >
                Flavor
                {#if sortColumn === 'flavor'}
                  <span class="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                {/if}
              </th>
              <th
                class="sortable"
                class:sorted={sortColumn === 'quantity'}
                onclick={() => handleColumnClick('quantity')}
              >
                Quantity
                {#if sortColumn === 'quantity'}
                  <span class="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                {/if}
              </th>
              <th
                class="sortable"
                class:sorted={sortColumn === 'location'}
                onclick={() => handleColumnClick('location')}
              >
                Location
                {#if sortColumn === 'location'}
                  <span class="sort-indicator">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                {/if}
              </th>
            </tr>
          </thead>
          <tbody>
            {#each sortedTableData() as { box, flavor }}
              <tr class="table-row" onclick={() => handleBoxClick(box.id)}>
                <td class="flavor-cell">
                  <span
                    class="flavor-indicator"
                    style="background-color: {getFlavorColor(box.flavorId)};"
                  ></span>
                  {flavor?.name || 'Unknown'}
                  {#if box.isOpen}
                    <span class="open-badge">Open</span>
                  {/if}
                </td>
                <td class="quantity-cell">{box.quantity}</td>
                <td class="location-cell">
                  {formatLocation(box.location.stack, box.location.height)}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  {/if}
</div>

<!-- New Flavor Modal -->
<Modal open={isNewFlavorModalOpen} title="Add New Flavor" onclose={closeNewFlavorModal} size="sm">
  <div class="modal-form">
    <div class="form-group">
      <label for="flavor-name">Flavor Name</label>
      <input
        id="flavor-name"
        type="text"
        bind:value={newFlavorName}
        placeholder="Enter flavor name"
        class="text-input"
      />
    </div>

    <div class="form-group">
      <label class="checkbox-label">
        <input type="checkbox" bind:checked={newFlavorExcludeFromRandom} />
        Exclude from random selection
      </label>
    </div>
  </div>

  {#snippet footer()}
    <Button variant="ghost" onclick={closeNewFlavorModal}>Cancel</Button>
    <Button variant="primary" onclick={handleSaveNewFlavor} disabled={newFlavorName.trim() === ''}>
      Save
    </Button>
  {/snippet}
</Modal>

<style>
  /**
   * Inventory Screen Layout
   */
  .inventory-screen {
    min-height: 100vh;
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  /**
   * Header with controls
   */
  .inventory-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .inventory-header h1 {
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    margin: 0;
  }

  .controls {
    display: flex;
    gap: var(--space-3);
    flex-wrap: wrap;
  }

  /**
   * Visual View Styles
   */
  .visual-view {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  .stacks-container {
    display: flex;
    gap: var(--space-6);
    overflow-x: auto;
    padding: var(--space-4);
  }

  .stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    min-width: 200px;
  }

  .stack-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    text-align: center;
    padding: var(--space-2);
    background-color: var(--color-surface-100);
    border-radius: var(--radius-base);
  }

  .stack-boxes {
    display: flex;
    flex-direction: column-reverse;
    gap: var(--space-2);
  }

  .box-visual {
    padding: var(--space-4);
    border-radius: var(--radius-base);
    cursor: pointer;
    transition:
      transform var(--transition-base) var(--transition-timing),
      box-shadow var(--transition-base) var(--transition-timing);
    box-shadow: var(--shadow-base);
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .box-visual:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }

  .box-visual.box-open {
    border: 3px solid rgba(255, 255, 255, 0.8);
  }

  .box-flavor {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
    margin-bottom: var(--space-1);
  }

  .box-quantity {
    font-size: var(--font-size-sm);
  }

  .box-status {
    font-size: var(--font-size-xs);
    margin-top: var(--space-1);
    opacity: 0.9;
  }

  /**
   * Out of Stock Section
   */
  .out-of-stock-section {
    padding: var(--space-6);
    background-color: var(--color-surface-100);
    border-radius: var(--radius-lg);
  }

  .out-of-stock-section h2 {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    margin: 0 0 var(--space-4) 0;
  }

  .out-of-stock-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .out-of-stock-item {
    padding: var(--space-2) var(--space-4);
    background-color: var(--color-surface-200);
    border-left: 4px solid;
    border-radius: var(--radius-base);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  /**
   * Table View Styles
   */
  .table-view {
    overflow-x: auto;
  }

  .inventory-table {
    width: 100%;
    border-collapse: collapse;
    background-color: var(--color-surface-100);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .inventory-table thead {
    background-color: var(--color-surface-300);
  }

  .inventory-table th {
    padding: var(--space-4);
    text-align: left;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .inventory-table th.sortable {
    cursor: pointer;
    user-select: none;
    transition: background-color var(--transition-base) var(--transition-timing);
  }

  .inventory-table th.sortable:hover {
    background-color: var(--color-surface-200);
  }

  .inventory-table th.sorted {
    color: var(--color-primary);
  }

  .sort-indicator {
    margin-left: var(--space-1);
    font-size: var(--font-size-lg);
  }

  .inventory-table tbody tr {
    border-bottom: 1px solid var(--color-border-light);
  }

  .inventory-table tbody tr:last-child {
    border-bottom: none;
  }

  .table-row {
    cursor: pointer;
    transition: background-color var(--transition-base) var(--transition-timing);
  }

  .table-row:hover {
    background-color: var(--color-surface-200);
  }

  .inventory-table td {
    padding: var(--space-4);
    font-size: var(--font-size-base);
    color: var(--color-text-primary);
  }

  .flavor-cell {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .flavor-indicator {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .open-badge {
    display: inline-block;
    padding: var(--space-1) var(--space-2);
    background-color: var(--color-primary);
    color: white;
    font-size: var(--font-size-xs);
    border-radius: var(--radius-base);
    margin-left: var(--space-2);
  }

  .quantity-cell {
    font-weight: var(--font-weight-medium);
  }

  .location-cell {
    color: var(--color-text-secondary);
  }

  /**
   * Empty State
   */
  .empty-state {
    text-align: center;
    padding: var(--space-8);
    color: var(--color-text-secondary);
  }

  .empty-state p {
    margin: 0;
    font-size: var(--font-size-lg);
  }

  .empty-hint {
    margin-top: var(--space-2);
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
  }

  /**
   * Modal Form Styles
   */
  .modal-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .form-group label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
  }

  .text-input {
    padding: var(--space-3);
    font-size: var(--font-size-base);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-base);
    background-color: var(--color-surface-100);
    color: var(--color-text-primary);
    transition: border-color var(--transition-base) var(--transition-timing);
  }

  .text-input:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
    font-size: var(--font-size-base);
  }

  .checkbox-label input[type='checkbox'] {
    cursor: pointer;
  }

  /**
   * Responsive Design
   */
  @media (min-width: 768px) {
    .inventory-screen {
      padding: var(--space-8);
    }

    .inventory-header {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
    }

    .stacks-container {
      padding: var(--space-6);
    }

    .stack {
      min-width: 250px;
    }
  }
</style>
