const readline = require('node:readline');
const { v7: uuid } = require('uuid');
const logger = require('@medic/logger');
const archivingUtils = require('@medic/archiving-utils');
const constants = require('@medic/constants');

const db = require('../db');
const auth = require('../auth');
const serverUtils = require('../server-utils');
const errors = require('../errors');

const MAX_IDS_PER_JOB = 100 * 1000;
// Matches routing's MAX_REQUEST_SIZE; enforced here because this route skips the body parsers.
const MAX_BODY_SIZE = 32 * 1024 * 1024;
const EXPECTED_CONTENT_TYPE = 'text/csv';
const parseCell = (line) => line.trim().replace(/^"(.*)"$/, '$1');

const checkAdmin = async (req) => {
  const userCtx = await auth.getUserCtx(req);
  if (!auth.isDbAdmin(userCtx)) {
    throw new errors.AuthenticationError('User is not an admin');
  }
};

const checkContentType = (req) => {
  if (!req.is(EXPECTED_CONTENT_TYPE)) {
    throw new errors.ContentTypeError(`Content-Type must be ${EXPECTED_CONTENT_TYPE}`);
  }
};

const buildJobId = () => `${constants.PREFIXES.ARCHIVE_JOB}${uuid()}`;

const persistJob = async (jobs, ids) => {
  if (!ids.length) {
    return;
  }

  const doc = {
    _id: buildJobId(),
    type: constants.PREFIXES.ARCHIVE_JOB,
    date: Date.now(),
    total: ids.length,
    cursor: 0,
    _attachments: {
      [archivingUtils.ATTACHMENT_NAME]: {
        content_type: archivingUtils.ATTACHMENT_TYPE,
        data: archivingUtils.encodeIds(ids),
      },
    },
  };

  await db.sentinel.put(doc);
  jobs.push({ id: doc._id, count: doc.total });
};

const flushIfFull = async (jobs, buffer) => {
  if (buffer.length < MAX_IDS_PER_JOB) {
    return buffer;
  }
  await persistJob(jobs, buffer);
  return [];
};

const processPayload = async (req) => {
  const jobs = [];
  let buffer = [];
  let receivedBytes = 0;
  let tooLarge = false;
  const rl = readline.createInterface({ input: req, crlfDelay: Infinity });
  req.on('data', (chunk) => {
    receivedBytes += chunk.length;
    if (receivedBytes > MAX_BODY_SIZE) {
      tooLarge = true;
      rl.close();
      req.pause();
    }
  });

  for await (const line of rl) {
    const id = parseCell(line);
    if (!id) {
      continue;
    }
    buffer.push(id);
    buffer = await flushIfFull(jobs, buffer);
  }

  if (tooLarge) {
    throw new errors.PayloadTooLargeError(`Request body is larger than ${MAX_BODY_SIZE} bytes`);
  }

  await persistJob(jobs, buffer);

  if (!jobs.length) {
    throw new errors.BadRequestError('No valid doc IDs found in request body');
  }
  return jobs;
};

/**
 * POST /api/v1/archive — accepts a text/csv body of doc ids (one per line) and enqueues archive
 * jobs for sentinel.
 *
 * Jobs are persisted while the payload streams in, so a mid-payload failure leaves the
 * already-created jobs queued even though the client receives an error. A full-payload retry
 * re-creates jobs for those ids; this is safe because archiving is idempotent (archive writes use
 * new_edits:false and audit entries are deduped) — duplicate jobs only cost redundant processing.
 */
module.exports = {
  create: async (req, res) => {
    try {
      await checkAdmin(req);
      checkContentType(req);
    } catch (err) {
      return serverUtils.error(err, req, res);
    }

    try {
      const jobs = await processPayload(req);
      res.status(201).json({ jobs });
    } catch (err) {
      logger.error('Failed to create archive jobs: %o', err);
      return serverUtils.error(err, req, res);
    }
  },
};
