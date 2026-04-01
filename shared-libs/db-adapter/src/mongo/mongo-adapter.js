const { ObjectId } = require('mongodb');
const revisions = require('./mongo-revisions');
const changes = require('./mongo-changes');
const views = require('./mongo-views');

const NOT_FOUND_ERROR = (id) => {
  const err = new Error('missing');
  err.status = 404;
  err.reason = 'missing';
  err.docId = id;
  return err;
};

const CONFLICT_ERROR = (id) => {
  const err = new Error('Document update conflict');
  err.status = 409;
  err.name = 'conflict';
  err.docId = id;
  return err;
};

class MongoAdapter {
  constructor(collection, db, dbName) {
    this._collection = collection;
    this._db = db;
    this._dbName = dbName;
  }

  get backendType() {
    return 'mongodb';
  }

  async get(id, opts = {}) {
    if (!id) {
      throw NOT_FOUND_ERROR(id);
    }

    const doc = await this._collection.findOne({ _id: id });
    if (!doc || (doc._deleted && !opts.rev)) {
      throw NOT_FOUND_ERROR(id);
    }

    return this._formatDoc(doc, opts);
  }

  async put(doc) {
    if (!doc._id) {
      throw new Error('Missing _id');
    }

    if (doc._rev) {
      return this._update(doc);
    }

    return this._insert(doc);
  }

  async post(doc) {
    if (!doc._id) {
      doc._id = new ObjectId().toString();
    }
    return this._insert(doc);
  }

  async remove(docOrId, revOrOpts) {
    let id, rev;
    if (typeof docOrId === 'string') {
      id = docOrId;
      rev = typeof revOrOpts === 'string' ? revOrOpts : undefined;
    } else {
      id = docOrId._id;
      rev = docOrId._rev;
    }

    if (!rev) {
      throw CONFLICT_ERROR(id);
    }

    const newRev = revisions.generateNextRev(rev, { _id: id, _deleted: true });
    const result = await this._collection.findOneAndUpdate(
      { _id: id, _rev: rev },
      { $set: { _deleted: true, _rev: newRev } },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw CONFLICT_ERROR(id);
    }

    await changes.recordChange(this._db, id, newRev, true);
    return { ok: true, id, rev: newRev };
  }

  async allDocs(opts = {}) {
    const query = { _deleted: { $ne: true } };
    let sort = { _id: 1 };

    if (opts.descending) {
      sort = { _id: -1 };
    }

    if (opts.keys) {
      query._id = { $in: opts.keys };
      delete query._deleted;
    } else if (opts.startkey !== undefined || opts.endkey !== undefined) {
      query._id = query._id || {};
      if (opts.startkey !== undefined) {
        Object.assign(query._id, opts.descending ? { $lte: opts.startkey } : { $gte: opts.startkey });
      }
      if (opts.endkey !== undefined) {
        const op = opts.inclusive_end === false ? (opts.descending ? '$gt' : '$lt') : (opts.descending ? '$gte' : '$lte');
        Object.assign(query._id, { [op]: opts.endkey });
      }
    } else if (opts.key !== undefined) {
      query._id = opts.key;
    }

    const cursor = this._collection.find(query).sort(sort);

    if (opts.skip) {
      cursor.skip(opts.skip);
    }
    if (opts.limit !== undefined) {
      cursor.limit(opts.limit);
    }

    const docs = await cursor.toArray();

    const rows = opts.keys
      ? opts.keys.map(key => {
        const doc = docs.find(d => d._id === key);
        if (!doc) {
          return { key, error: 'not_found' };
        }
        if (doc._deleted) {
          return { id: key, key, value: { rev: doc._rev, deleted: true } };
        }
        const row = { id: doc._id, key: doc._id, value: { rev: doc._rev } };
        if (opts.include_docs) {
          row.doc = this._formatDoc(doc);
        }
        return row;
      })
      : docs.map(doc => {
        const row = { id: doc._id, key: doc._id, value: { rev: doc._rev } };
        if (opts.include_docs) {
          row.doc = this._formatDoc(doc);
        }
        return row;
      });

    const totalRows = opts.keys ? rows.length : await this._collection.countDocuments({ _deleted: { $ne: true } });

    return {
      total_rows: totalRows,
      offset: opts.skip || 0,
      rows,
    };
  }

  async bulkDocs(docs, opts = {}) {
    if (!docs || !docs.length) {
      return [];
    }

    if (opts.new_edits === false) {
      return this._bulkDocsNoEdit(docs);
    }

    const results = [];
    for (const doc of docs) {
      try {
        const result = doc._rev ? await this._update(doc) : await this._insert(doc);
        results.push(result);
      } catch (err) {
        results.push({ id: doc._id, error: err.name || 'error', reason: err.message });
      }
    }
    return results;
  }

  async bulkGet(opts = {}) {
    const docRequests = opts.docs || [];
    const ids = docRequests.map(d => d.id);
    const docs = await this._collection.find({ _id: { $in: ids } }).toArray();
    const docsById = {};
    for (const doc of docs) {
      docsById[doc._id] = doc;
    }

    return {
      results: docRequests.map(req => {
        const doc = docsById[req.id];
        if (!doc) {
          return {
            id: req.id,
            docs: [{ error: { id: req.id, rev: req.rev, error: 'not_found', reason: 'missing' } }],
          };
        }
        return {
          id: req.id,
          docs: [{ ok: this._formatDoc(doc, { attachments: opts.attachments, revs: opts.revs }) }],
        };
      }),
    };
  }

  async query(view, opts) {
    return views.queryView(view, this._collection, opts);
  }

  changes(opts = {}) {
    return changes.createChangesFeed(this._db, this._collection, opts);
  }

  async getAttachment(docId, attachmentId) {
    const doc = await this._collection.findOne({ _id: docId });
    if (!doc || !doc._attachments || !doc._attachments[attachmentId]) {
      throw NOT_FOUND_ERROR(docId);
    }
    const att = doc._attachments[attachmentId];
    return att.data;
  }

  async putAttachment(docId, attachmentId, rev, data, type) {
    const newRev = revisions.generateNextRev(rev, { _id: docId, _attachment: attachmentId });
    const result = await this._collection.findOneAndUpdate(
      { _id: docId, _rev: rev },
      {
        $set: {
          _rev: newRev,
          [`_attachments.${attachmentId}`]: { data, content_type: type, length: data.length },
        },
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      throw CONFLICT_ERROR(docId);
    }

    return { ok: true, id: docId, rev: newRev };
  }

  async info() {
    const stats = await this._db.command({ collStats: this._collection.collectionName });
    const seq = await changes.getCurrentSeq(this._db);
    return {
      db_name: this._dbName,
      doc_count: stats.count || 0,
      update_seq: seq,
    };
  }

  async close() {
    // Connection lifecycle managed by factory, not individual adapters
  }

  async compact() {
    await this._db.command({ compact: this._collection.collectionName });
  }

  async viewCleanup() {
    // No-op for MongoDB
  }

  async destroy() {
    await this._collection.drop();
  }

  async ensureIndexes() {
    await changes.ensureIndexes(this._db);
  }

  // --- Private methods ---

  async _insert(doc) {
    const newRev = revisions.generateFirstRev(doc);
    const toStore = { ...doc, _rev: newRev };

    try {
      await this._collection.insertOne(toStore);
    } catch (err) {
      if (err.code === 11000) {
        throw CONFLICT_ERROR(doc._id);
      }
      throw err;
    }

    await changes.recordChange(this._db, doc._id, newRev, false);
    return { ok: true, id: doc._id, rev: newRev };
  }

  async _update(doc) {
    const currentRev = doc._rev;
    const newRev = revisions.generateNextRev(currentRev, doc);
    const toStore = { ...doc, _rev: newRev };

    const result = await this._collection.findOneAndReplace(
      { _id: doc._id, _rev: currentRev },
      toStore,
      { returnDocument: 'after' }
    );

    if (!result) {
      const existing = await this._collection.findOne({ _id: doc._id });
      if (!existing) {
        throw NOT_FOUND_ERROR(doc._id);
      }
      throw CONFLICT_ERROR(doc._id);
    }

    await changes.recordChange(this._db, doc._id, newRev, false);
    return { ok: true, id: doc._id, rev: newRev };
  }

  async _bulkDocsNoEdit(docs) {
    // new_edits: false — accept docs with their existing _rev values.
    // Used by the replication protocol to push docs as-is.
    const operations = docs.map(doc => ({
      replaceOne: {
        filter: { _id: doc._id },
        replacement: doc,
        upsert: true,
      },
    }));

    const errors = [];
    const errorIds = new Set();
    try {
      await this._collection.bulkWrite(operations, { ordered: false });
    } catch (err) {
      if (err.writeErrors) {
        for (const writeErr of err.writeErrors) {
          const id = docs[writeErr.index]?._id;
          errorIds.add(id);
          errors.push({ id, error: 'error', reason: writeErr.errmsg });
        }
      } else {
        throw err;
      }
    }

    const successDocs = docs.filter(doc => !errorIds.has(doc._id));
    if (successDocs.length) {
      await changes.recordChanges(
        this._db,
        successDocs.map(doc => ({ id: doc._id, rev: doc._rev, deleted: doc._deleted || false }))
      );
    }

    return errors;
  }

  _formatDoc(doc, opts = {}) {
    if (!doc) {
      return doc;
    }
    const result = { ...doc };
    // Remove MongoDB internal fields if present
    delete result.__v;

    if (!opts.attachments && result._attachments) {
      // Strip binary data from attachments, keep metadata only
      const cleaned = {};
      for (const [name, att] of Object.entries(result._attachments)) {
        cleaned[name] = {
          content_type: att.content_type,
          length: att.length,
          stub: true,
        };
      }
      result._attachments = cleaned;
    }

    return result;
  }
}

module.exports = MongoAdapter;
