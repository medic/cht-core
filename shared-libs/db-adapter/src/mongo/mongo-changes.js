const { EventEmitter } = require('events');

/**
 * MongoDB changes feed implementation.
 *
 * Supports two modes:
 * - **Live mode** (`live: true`): Uses MongoDB Change Streams to watch for
 *   real-time changes. Emits 'change' events as documents are modified.
 * - **One-shot mode** (`live: false`): Queries the changelog collection for
 *   changes since a given sequence number.
 *
 * Sequence tracking uses a `_changelog` collection that stores an entry
 * for each document write with an auto-incrementing `_seq` field. This
 * gives us simple numeric sequences compatible with PouchDB/CouchDB consumers.
 */

const CHANGELOG_COLLECTION = '_changelog';
const SEQ_COUNTER_ID = '_seq_counter';
const COUNTERS_COLLECTION = '_counters';

/**
 * Record a change in the changelog after a document write.
 * Called by MongoAdapter after put/post/remove/bulkDocs operations.
 *
 * @param {Db} db - MongoDB database instance
 * @param {string} docId - The document ID that changed
 * @param {string} rev - The new revision
 * @param {boolean} deleted - Whether the doc was deleted
 */
const recordChange = async (db, docId, rev, deleted = false) => {
  const seq = await getNextSeq(db);
  await db.collection(CHANGELOG_COLLECTION).insertOne({
    _seq: seq,
    id: docId,
    rev: rev,
    deleted: deleted,
    timestamp: new Date(),
  });
  return seq;
};

/**
 * Record multiple changes in a single batch.
 */
const recordChanges = async (db, changes) => {
  if (!changes.length) {
    return;
  }

  const startSeq = await getNextSeqBatch(db, changes.length);
  const docs = changes.map((change, i) => ({
    _seq: startSeq + i,
    id: change.id,
    rev: change.rev,
    deleted: change.deleted || false,
    timestamp: new Date(),
  }));

  await db.collection(CHANGELOG_COLLECTION).insertMany(docs);
};

const getNextSeq = async (db) => {
  const result = await db.collection(COUNTERS_COLLECTION).findOneAndUpdate(
    { _id: SEQ_COUNTER_ID },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  return result.value;
};

const getNextSeqBatch = async (db, count) => {
  const result = await db.collection(COUNTERS_COLLECTION).findOneAndUpdate(
    { _id: SEQ_COUNTER_ID },
    { $inc: { value: count } },
    { upsert: true, returnDocument: 'after' }
  );
  return result.value - count + 1;
};

/**
 * Get the current (latest) sequence number.
 */
const getCurrentSeq = async (db) => {
  const counter = await db.collection(COUNTERS_COLLECTION).findOne({ _id: SEQ_COUNTER_ID });
  return counter ? counter.value : 0;
};

/**
 * Create a changes feed emitter for the given database.
 *
 * @param {Db} db - MongoDB database instance
 * @param {Collection} docsCollection - The main documents collection
 * @param {object} opts - Options matching PouchDB changes() API
 * @returns {EventEmitter} Emitter with 'change', 'error', 'complete' events and cancel()
 */
const createChangesFeed = (db, docsCollection, opts = {}) => {
  const emitter = new EventEmitter();
  let cancelled = false;

  emitter.cancel = () => {
    cancelled = true;
    emitter.emit('cancelled');
  };

  if (opts.live) {
    startLiveFeed(db, docsCollection, opts, emitter, () => cancelled);
  } else {
    // Make non-live emitter thenable (like PouchDB's changes object)
    // so that `await db.changes(opts)` resolves with the result.
    const promise = new Promise((resolve, reject) => {
      emitter.on('complete', resolve);
      emitter.on('error', reject);
    });
    emitter.then = (onFulfilled, onRejected) => promise.then(onFulfilled, onRejected);
    emitter.catch = (onRejected) => promise.catch(onRejected);

    startOneShotFeed(db, opts, emitter);
  }

  return emitter;
};

const startLiveFeed = (db, docsCollection, opts, emitter, isCancelled) => {
  const since = opts.since === 'now' ? null : (opts.since || 0);

  const startWatching = async () => {
    // If since is a number, first replay any missed changes from the changelog
    if (since !== null && since !== 'now') {
      const missed = await queryChangelog(db, { since, include_docs: opts.include_docs }, docsCollection);
      for (const change of missed.results) {
        if (isCancelled()) {
          return;
        }
        emitter.emit('change', change);
      }
    }

    if (isCancelled()) {
      return;
    }

    // Now watch for new changes via Change Stream
    const pipeline = buildWatchPipeline(opts);
    let streamOpts = { fullDocument: 'updateLookup' };

    const stream = docsCollection.watch(pipeline, streamOpts);

    const cleanup = () => {
      stream.close().catch(() => {});
    };

    emitter.cancel = () => {
      emitter.emit('cancelled');
      cleanup();
    };

    stream.on('change', async (event) => {
      if (isCancelled()) {
        cleanup();
        return;
      }

      const docId = event.documentKey._id;
      const isDelete = event.operationType === 'delete';
      const doc = isDelete ? null : event.fullDocument;
      const rev = doc ? doc._rev : undefined;

      // Get or estimate the seq for this change
      const seq = await getCurrentSeq(db);

      const change = {
        id: docId,
        seq: seq,
        changes: [{ rev }],
        deleted: isDelete,
      };

      if (opts.include_docs && doc) {
        change.doc = doc;
      }

      emitter.emit('change', change);
    });

    stream.on('error', (err) => {
      emitter.emit('error', err);
    });
  };

  startWatching().catch(err => emitter.emit('error', err));
};

const startOneShotFeed = async (db, opts, emitter) => {
  try {
    const result = await queryChangelog(db, opts);
    emitter.emit('complete', result);
    // PouchDB also resolves the return value as a promise-like
    emitter.results = result.results;
    emitter.last_seq = result.last_seq;
  } catch (err) {
    emitter.emit('error', err);
  }
};

const queryChangelog = async (db, opts, docsCollection = null) => {
  const since = opts.since || 0;
  const query = { _seq: { $gt: since } };

  if (opts.doc_ids) {
    query.id = { $in: opts.doc_ids };
  }

  const cursor = db.collection(CHANGELOG_COLLECTION)
    .find(query)
    .sort({ _seq: 1 });

  if (opts.limit) {
    cursor.limit(opts.limit);
  }

  const entries = await cursor.toArray();

  const results = [];
  for (const entry of entries) {
    const change = {
      id: entry.id,
      seq: entry._seq,
      changes: [{ rev: entry.rev }],
      deleted: entry.deleted || false,
    };

    if (opts.include_docs && docsCollection) {
      const doc = await docsCollection.findOne({ _id: entry.id });
      change.doc = doc;
    }

    results.push(change);
  }

  const lastSeq = entries.length > 0
    ? entries[entries.length - 1]._seq
    : await getCurrentSeq(db);

  return {
    results,
    last_seq: lastSeq,
  };
};

const buildWatchPipeline = (opts) => {
  const pipeline = [];

  // Only watch inserts, updates, replacements, and deletes
  pipeline.push({
    $match: {
      operationType: { $in: ['insert', 'update', 'replace', 'delete'] },
    },
  });

  if (opts.doc_ids) {
    pipeline.push({
      $match: {
        'documentKey._id': { $in: opts.doc_ids },
      },
    });
  }

  return pipeline;
};

/**
 * Ensure the changelog collection has the necessary indexes.
 * Should be called once during database initialization.
 */
const ensureIndexes = async (db) => {
  const changelog = db.collection(CHANGELOG_COLLECTION);
  const safeCreateIndex = async (collection, keys, opts = {}) => {
    try {
      await collection.createIndex(keys, opts);
    } catch (err) {
      // 85 = IndexOptionsConflict (index already exists with different name) — safe to ignore
      if (err.code !== 85) {
        throw err;
      }
    }
  };
  await safeCreateIndex(changelog, { _seq: 1 }, { unique: true });
  await safeCreateIndex(changelog, { id: 1, _seq: 1 });
};

module.exports = {
  createChangesFeed,
  recordChange,
  recordChanges,
  getCurrentSeq,
  ensureIndexes,
  CHANGELOG_COLLECTION,
};
