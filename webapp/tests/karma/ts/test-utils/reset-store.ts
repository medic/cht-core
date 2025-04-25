/**
 * Helper utility for tests that involve Redux store mocks
 * Prevents "Cannot read properties of undefined (reading 'resetSelectors')" error in tests
 */
export const resetStoreSelectors = () => {
  try {
    // Try to reset the selectors if possible, but don't fail the test if it's not available
    // This is a workaround for the "Cannot read properties of undefined (reading 'resetSelectors')" error
    const store = (window as any).__REDUX_STORE__;
    if (store && typeof store.resetSelectors === 'function') {
      store.resetSelectors();
    }
  } catch (err) {
    console.warn('Failed to reset store selectors:', err);
  }
}; 
