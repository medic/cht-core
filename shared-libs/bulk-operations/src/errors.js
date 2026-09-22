/**
 * A bulk operation that cannot legally run: a contact that no longer exists, a move that would create
 * a cycle, linked users that would be stranded. The API turns this into a 400 and Sentinel records it
 * on the log, so the same check serves the caller and the planner.
 */
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

module.exports = { ValidationError };
