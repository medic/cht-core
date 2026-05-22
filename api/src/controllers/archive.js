const readline = require('readline');
const { v7: uuid } = require('uuid');
const logger = require('@medic/logger');
const archivingUtils = require('@medic/archiving-utils');
const constants = require('@medic/constants');

const db = require('../db');
const auth = require('../auth');
const serverUtils = require('../server-utils');
const errors = require('../errors');

const MAX_IDS_PER_JOB = 100 * 1000;
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

const processPayload = async (req) => {
  const jobs = [];
  let buffer = [];
  const rl = readline.createInterface({ input: req, crlfDelay: Infinity });

  for await (const line of rl) {
    const id = parseCell(line);
    if (!id) {
      continue;
    }
    buffer.push(id);
    if (buffer.length >= MAX_IDS_PER_JOB) {
      await persistJob(jobs, buffer);
      buffer = [];
    }
  }

  await persistJob(jobs, buffer);

  if (!jobs.length) {
    throw new errors.BadRequestError('No valid doc IDs found in request body');
  }
  return jobs;
};

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
