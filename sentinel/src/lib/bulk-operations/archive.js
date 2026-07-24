const logger = require('@medic/logger');
const archiving = require('../archiving');

// Archive the batch directly: copy the docs to the archive database and purge them from medic.
// The whole batch fails if archiving throws.
const archive = async (batch, actionId) => {
  const failed = [];
  const ids = [];
  batch.forEach(op => {
    if (op.id) {
      ids.push(op.id);
    } else {
      logger.error(`bulk-operations: archive skipped an operation with no id (action ${actionId})`);
      failed.push(op);
    }
  });

  if (!ids.length) {
    return failed;
  }

  try {
    const rejected = await archiving.archiveBatch(ids);
    rejected.forEach(id => failed.push({ id }));
  } catch (err) {
    logger.error(`bulk-operations: archive failed (action ${actionId}): %o`, err);
    return batch;
  }
  return failed;
};

module.exports = { archive };
