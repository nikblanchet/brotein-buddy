import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import Counter from '../../src/lib/components/Counter.svelte'

describe('Counter Component', () => {
  it('renders with initial count of 0', () => {
    render(Counter)
    const countElement = screen.getByTestId('count')
    expect(countElement.textContent).toBe('0')
  })

  it('increments count when + button is clicked', async () => {
    const user = userEvent.setup()
    render(Counter)

    const incrementButton = screen.getByTestId('increment')
    await user.click(incrementButton)

    const countElement = screen.getByTestId('count')
    expect(countElement.textContent).toBe('1')
  })

  it('decrements count when - button is clicked', async () => {
    const user = userEvent.setup()
    render(Counter)

    const decrementButton = screen.getByTestId('decrement')
    await user.click(decrementButton)

    const countElement = screen.getByTestId('count')
    expect(countElement.textContent).toBe('-1')
  })

  it('resets count to 0 when reset button is clicked', async () => {
    const user = userEvent.setup()
    render(Counter)

    // Increment a few times
    const incrementButton = screen.getByTestId('increment')
    await user.click(incrementButton)
    await user.click(incrementButton)
    await user.click(incrementButton)

    // Reset
    const resetButton = screen.getByTestId('reset')
    await user.click(resetButton)

    const countElement = screen.getByTestId('count')
    expect(countElement.textContent).toBe('0')
  })

  it('handles multiple operations correctly', async () => {
    const user = userEvent.setup()
    render(Counter)

    const incrementButton = screen.getByTestId('increment')
    const decrementButton = screen.getByTestId('decrement')
    const countElement = screen.getByTestId('count')

    await user.click(incrementButton) // 1
    await user.click(incrementButton) // 2
    await user.click(decrementButton) // 1
    await user.click(incrementButton) // 2

    expect(countElement.textContent).toBe('2')
  })
})
