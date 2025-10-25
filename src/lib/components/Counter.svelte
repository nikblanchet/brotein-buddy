<script lang="ts">
  let count = $state(0)

  function increment() {
    count++
  }

  function decrement() {
    count--
  }

  function reset() {
    count = 0
  }
</script>

<div class="counter">
  <h2>Count: <span data-testid="count">{count}</span></h2>
  <div class="buttons">
    <button data-testid="decrement" onclick={decrement}>-</button>
    <button data-testid="reset" onclick={reset}>Reset</button>
    <button data-testid="increment" onclick={increment}>+</button>
  </div>
</div>

<style>
  .counter {
    text-align: center;
    padding: 2rem;
  }

  .buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 1rem;
  }

  button {
    padding: 0.5rem 1rem;
    font-size: 1rem;
    cursor: pointer;
  }
</style>
