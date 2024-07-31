/**
 * Represents an error that occurs when an invalid argument is provided.
 * This error is typically thrown when a function or method receives an argument
 * that doesn't meet the expected criteria or constraints.
 */
export class InvalidArgumentError extends Error {
  /**
   * Constructor
   * @param message a descriptive error message why the error was raised
   */
  constructor(message: string) {
    super(message);
    this.name = message;

    Object.setPrototypeOf(this, InvalidArgumentError.prototype);
  }
}
