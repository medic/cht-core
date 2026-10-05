const { RetryableError, isConflict } = require('./errors');

/**
 * Writes the docs and returns the rows that failed for good. `bulkDocs` reports a failure as a row
 * rather than by rejecting, so interpreting those rows is what writing means here and no caller has
 * to remember it: a row that lost to a concurrent edit is raised, because the next attempt reads the
 * revision that won, and everything else is handed back for the handler to record.
 * @param {Object} database - the database to write to
 * @param {Object[]} docs - the docs to write
 * @param {string} description - what was being written, for the message
 * @returns {Promise<Object[]>} the rows that failed and will not succeed by trying again
 * @throws {RetryableError} when any row lost to a concurrent edit
 */
const writeDocs = async (database, docs, description) => {
  const results = await database.bulkDocs(docs);
  const conflicted = results.filter(isConflict);
  if (conflicted.length) {
    throw new RetryableError(`${description} lost ${conflicted.length} doc(s) to a concurrent edit`);
  }

  return results.filter(result => result.error);
};

module.exports = { writeDocs };
