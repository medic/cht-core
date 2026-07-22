const { v7: uuid } = require('uuid');
const logger = require('@medic/logger');
const db = require('../../db');
const archivingUtils = require('@medic/archiving-utils');
const { PREFIXES } = require('@medic/constants');

const buildArchiveJob = (ids) => ({
  _id: `${PREFIXES.ARCHIVE_JOB}${uuid()}`,
  type: PREFIXES.ARCHIVE_JOB,
  date: Date.now(),
  total: ids.length,
  cursor: 0,
  _attachments: {
    [archivingUtils.ATTACHMENT_NAME]: {
      content_type: archivingUtils.ATTACHMENT_TYPE,
      data: archivingUtils.encodeIds(ids),
    },
  },
});

// Hand the batch off to the archiving queue; the archiving schedule copies the docs to the archive
// database and purges them from medic. The whole batch fails if the job cannot be written.
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
    await db.sentinel.put(buildArchiveJob(ids));
  } catch (err) {
    logger.error(`bulk-operations: archive failed to queue job (action ${actionId}): %o`, err);
    return batch;
  }
  return failed;
};

module.exports = { archive };
