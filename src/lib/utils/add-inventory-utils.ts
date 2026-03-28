import type { Box, Flavor } from '../../types/models';
import { generateBoxId } from './id';
import { suggestNextLocation } from './location-validation';

/**
 * Builds a list of new closed boxes for a given flavor.
 *
 * Each closed box has quantity=12 and isOpen=false. Locations are assigned
 * sequentially using suggestNextLocation, accumulating previously built boxes
 * so that each new box gets a unique location.
 *
 * @param flavorId - The flavor to assign to each box
 * @param count - Number of closed boxes to build (must be >= 1)
 * @param existingBoxes - Current inventory boxes (used for location suggestion)
 * @returns Array of new Box objects ready to be added to inventory
 */
export function buildClosedBoxes(flavorId: string, count: number, existingBoxes: Box[]): Box[] {
  const result: Box[] = [];
  let accumulated = [...existingBoxes];

  for (let i = 0; i < count; i++) {
    const location = suggestNextLocation(accumulated);
    const box: Box = {
      id: generateBoxId(),
      flavorId,
      quantity: 12,
      isOpen: false,
      location,
    };
    accumulated.push(box);
    result.push(box);
  }

  return result;
}

/**
 * Builds a single new open box for a given flavor.
 *
 * @param flavorId - The flavor to assign to the box
 * @param quantity - Number of bottles in the box (1-12)
 * @param existingBoxes - Current inventory boxes (used for location suggestion)
 * @returns A new Box object ready to be added to inventory
 */
export function buildOpenBox(flavorId: string, quantity: number, existingBoxes: Box[]): Box {
  return {
    id: generateBoxId(),
    flavorId,
    quantity,
    isOpen: true,
    location: suggestNextLocation(existingBoxes),
  };
}

/**
 * Validates input for the add inventory flow.
 *
 * @param mode - 'closed' for full boxes, 'open' for a partial box
 * @param flavorId - Selected flavor ID
 * @param count - Number of closed boxes (only used when mode='closed')
 * @param quantity - Bottle count for open box (only used when mode='open')
 * @param flavors - Available flavors to validate flavorId against
 * @returns An error message string, or null if input is valid
 */
export function validateAddInventoryInput(
  mode: 'closed' | 'open',
  flavorId: string,
  count: number | null,
  quantity: number | null,
  flavors: Flavor[]
): string | null {
  if (!flavorId) {
    return 'Please select a flavor';
  }

  if (!flavors.some((f) => f.id === flavorId)) {
    return 'Selected flavor does not exist';
  }

  if (mode === 'closed') {
    if (count === null || count < 1 || !Number.isInteger(count)) {
      return 'Number of boxes must be at least 1';
    }
  } else {
    if (quantity === null || quantity < 1 || quantity > 12 || !Number.isInteger(quantity)) {
      return 'Quantity must be between 1 and 12';
    }
  }

  return null;
}
