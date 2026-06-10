/**
 * Hard limits on what an offline user is allowed to replicate, and the errors thrown when they are
 * exceeded. These limits are deliberately NOT admin-configurable (an over-provisioned user is a
 * systemic misconfiguration to fix, not a knob to raise). They are exposed as environment variables
 * so that server operators - a different trust boundary than in-app admins - can tune them for
 * unusual deployments, and so that tests can override them with small values.
 *
 * The limits are referenced through the exported `limits` object at call time, which lets tests
 * stub individual values (e.g. `sinon.stub(replicationLimit.limits, 'DOC_LIMIT').value(3)`).
 */

const parseLimit = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const limits = {
  // Maximum number of raw `docs_by_replication_key` hits accumulated while enumerating a user's
  // documents. A backstop that bails mid-enumeration; imprecise because a document can be counted
  // more than once across query batches.
  ENUMERATION_LIMIT: parseLimit(process.env.REPLICATION_ENUMERATION_LIMIT, 500000),
  // Maximum number of documents an offline user may replicate (tasks excluded, matching the warn
  // metric). This is the real policy limit.
  DOC_LIMIT: parseLimit(process.env.REPLICATION_DOC_LIMIT, 50000),
};

/**
 * Thrown when a user exceeds one of the hard replication limits. Carries a numeric `code` so
 * `server-utils.error` responds with the correct HTTP status (a non-numeric/absent code would be
 * treated as a 500).
 */
class ReplicationLimitError extends Error {
  constructor(message, limitType) {
    super(message);
    this.name = 'ReplicationLimitError';
    this.code = 413;
    this.error = 'doc_limit_exceeded';
    this.limitType = limitType;
  }
}

/**
 * Thrown when a user is rejected because they hit a replication limit recently and are still within
 * the cooldown window. Responds with a 429 so the user is not re-evaluated until the window passes.
 */
class ReplicationThrottledError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ReplicationThrottledError';
    this.code = 429;
    this.error = 'replication_throttled';
  }
}

module.exports = {
  limits,
  ReplicationLimitError,
  ReplicationThrottledError,
};
