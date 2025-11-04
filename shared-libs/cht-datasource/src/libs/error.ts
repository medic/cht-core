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
    this.name = 'InvalidArgumentError';
  }
}

/**
 * Represents an error that occurs when a requested resource is not found.
 * This error is typically thrown when a document or entity with the specified
 * identifier does not exist in the database.
 */
export class NotFoundError extends Error {
  /**
   * Constructor
   * @param message a descriptive error message why the error was raised
   */
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Represents an error that occurs when there's a document update conflict.
 * This error is typically thrown when trying to update a document with an
 * outdated or incorrect revision (_rev).
 */
export class ConflictError extends Error {
  /**
   * Constructor
   * @param message a descriptive error message why the error was raised
   */
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
