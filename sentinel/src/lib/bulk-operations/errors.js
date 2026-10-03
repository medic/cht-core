/**
 * A failure that is worth another attempt: CouchDB unavailable, a request that timed out, or a
 * write that lost to a concurrent edit. The scheduler re-runs the batch rather than recording its
 * operations as permanently failed, so it is kept distinct from an unexpected error, which fails
 * the action.
 */
class RetryableError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'RetryableError';
  }
}

// 408 is a timeout and 409 a conflict; anything 5xx is CouchDB itself rather than the request.
const RETRYABLE_STATUSES = new Set([ 408, 409 ]);

// PouchDB reports `status` and @medic/couch-request reports `statusCode`.
const statusOf = (err) => err?.status ?? err?.statusCode;

const isRetryableStatus = (err) => {
  const status = statusOf(err);
  return RETRYABLE_STATUSES.has(status) || (status >= 500 && status < 600);
};

/**
 * Runs a database call, turning the failures worth another attempt into a `RetryableError` and
 * leaving every other error to fail the action.
 * @param {string} description - what was being attempted, for the message
 * @param {Function} fn - the call to make
 */
const retryable = async (description, fn) => {
  try {
    return await fn();
  } catch (err) {
    if (isRetryableStatus(err)) {
      throw new RetryableError(`${description}: ${err.message || err.reason || err}`, { cause: err });
    }
    throw err;
  }
};

// bulkDocs reports a row that lost to a concurrent edit rather than rejecting, and the next attempt
// reads the revision that won, so it is retried rather than failed.
const isConflict = (row) => row.error === 'conflict';

module.exports = {
  RetryableError,
  retryable,
  statusOf,
  isRetryableStatus,
  isConflict,
};
