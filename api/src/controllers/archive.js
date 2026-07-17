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
const MAX_BODY_SIZE = constants.MAX_REQUEST_SIZE;
const EXPECTED_CONTENT_TYPE = 'text/csv';

/**
 * Extracts a doc id from one CSV line: trims whitespace and strips surrounding double quotes.
 * @param {string} line
 * @returns {string} the doc id, or an empty string for a blank line
 */
const parseCell = (line) => line.trim().replace(/^"(.*)"$/, '$1');

const checkContentType = (req) => {
  if (!req.is(EXPECTED_CONTENT_TYPE)) {
    throw new errors.ContentTypeError(`Content-Type must be ${EXPECTED_CONTENT_TYPE}`);
  }
};

const checkDeclaredSize = (req) => {
  if (Number(req.headers['content-length']) > MAX_BODY_SIZE) {
    throw new errors.PayloadTooLargeError(`Request body is larger than ${MAX_BODY_SIZE} bytes`);
  }
};

// uuid v7 is time-ordered, so jobs sort (and get processed) in creation order
const buildJobId = () => `${constants.PREFIXES.ARCHIVE_JOB}${uuid()}`;

/**
 * Saves one archive job doc to the sentinel db, carrying the ids as an attachment, and appends
 * its {id, count} summary to jobs. A no-op for an empty id list.
 * @param {Array<{id: string, count: number}>} jobs - accumulator of created job summaries
 * @param {string[]} ids - doc ids for this job
 * @returns {Promise<void>}
 */
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

/**
 * Persists the buffered ids as a job once the buffer reaches MAX_IDS_PER_JOB.
 * @param {Array<{id: string, count: number}>} jobs - accumulator of created job summaries
 * @param {string[]} buffer - ids collected so far
 * @returns {Promise<string[]>} the buffer to keep collecting into — emptied when flushed
 */
const flushIfFull = async (jobs, buffer) => {
  if (buffer.length < MAX_IDS_PER_JOB) {
    return buffer;
  }
  await persistJob(jobs, buffer);
  return [];
};

/**
 * Streams the CSV request body line by line, splitting the ids into archive job docs of at most
 * MAX_IDS_PER_JOB each. Jobs are persisted while the payload streams in, so a mid-payload
 * failure leaves the already-created jobs queued even though the client receives an error.
 * @param {NodeJS.ReadableStream} req - the request, consumed as a raw stream
 * @returns {Promise<Array<{id: string, count: number}>>} summaries of the created jobs
 * @throws {errors.PayloadTooLargeError} 413 when the streamed body exceeds MAX_BODY_SIZE
 * @throws {errors.BadRequestError} 400 when the body holds no usable doc ids
 */
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

module.exports = {
  /**
   * @openapi
   * /api/v1/archive:
   *   post:
   *     summary: Enqueue documents for archiving
   *     operationId: v1ArchivePost
   *     description: >
   *       Accepts a text/csv body of document ids — one id per line; surrounding double quotes are
   *       stripped and blank lines are ignored — and enqueues archive jobs that sentinel processes
   *       on its configured schedule. Jobs are persisted while the payload streams in, so a
   *       mid-payload failure leaves the already-created jobs queued even though the client
   *       receives an error. Retrying the full payload is safe because archiving is idempotent;
   *       duplicate jobs only cost redundant processing. Only allowed for database admins.
   *     tags: [Bulk]
   *     requestBody:
   *       required: true
   *       content:
   *         text/csv:
   *           schema:
   *             type: string
   *           example: |
   *             doc-id-1
   *             "doc-id-2"
   *     responses:
   *       '201':
   *         description: The created archive jobs, in payload order.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 jobs:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                         description: The id of the created archive job document.
   *                       count:
   *                         type: number
   *                         description: The number of document ids stored in the job.
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   *       '413':
   *         description: Request body is larger than the maximum allowed size.
   *       '415':
   *         description: Content-Type is not text/csv.
   */
  create: async (req, res) => {
    try {
      await auth.assertDbAdmin(req);
      checkContentType(req);
      checkDeclaredSize(req);
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
