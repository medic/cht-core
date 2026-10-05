/**
 * A failure the handler spotted itself and that is worth another attempt: so far, a write that lost
 * to a concurrent edit, which `bulkDocs` reports as a row rather than by throwing. Anything the
 * database throws is classified by its status instead, so this is only for what we detect.
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

/**
 * Whether a failure is worth running the batch again. Unexpected failures are the retryable ones:
 * CouchDB being unavailable, a request timing out, a write losing a race. Anything we can predict is
 * handled where it happens and never reaches here.
 */
const isRetryable = (err) => {
  if (err instanceof RetryableError) {
    return true;
  }

  const status = statusOf(err);
  return RETRYABLE_STATUSES.has(status) || (status >= 500 && status < 600);
};

// bulkDocs reports a row that lost to a concurrent edit rather than rejecting, and the next attempt
// reads the revision that won, so it is retried rather than failed.
const isConflict = (row) => row.error === 'conflict';

module.exports = {
  RetryableError,
  isRetryable,
  statusOf,
  isConflict,
};
