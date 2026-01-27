/**
 * Evaluates a string as a function and returns the result.
 * @param str the string to evaluate
 * @param args the arguments to pass to the function
 * @returns the result of the function or the original string if evaluation fails
 */
const getValueFromFunction = (str: string | undefined, ...args: unknown[]): string | undefined => {
  if (!str) {
    return str;
  }
  try {
    const fn = new Function(`return (${str})`)();
    if (typeof fn === 'function') {
      return fn(...args);
    }
    return str;
  } catch (error) {
    console.trace('Error evaluating function from string:', error);
    return str;
  }
};

// Direct exports (export const ...) cannot be stubbed by sinon
export default {
  getValueFromFunction
};
