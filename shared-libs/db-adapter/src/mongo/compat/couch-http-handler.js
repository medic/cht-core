/**
 * CouchDB HTTP API compatibility handler.
 *
 * Provides Express route handlers that implement the CouchDB HTTP API
 * backed by a MongoAdapter. This allows PouchDB's HTTP adapter to work
 * transparently against MongoDB.
 */

const createHandlers = (getAdapter) => {
  // Database info
  const dbInfo = async (req, res) => {
    try {
      const info = await getAdapter(req).info();
      res.json(info);
    } catch (err) {
      sendError(res, err);
    }
  };

  // Get document
  const getDoc = async (req, res) => {
    try {
      const adapter = getAdapter(req);
      const opts = {};
      if (req.query.revs === 'true') {
        opts.revs = true; 
      }
      if (req.query.revs_info === 'true') {
        opts.revs_info = true; 
      }
      if (req.query.conflicts === 'true') {
        opts.conflicts = true; 
      }
      if (req.query.attachments === 'true') {
        opts.attachments = true; 
      }
      if (req.query.rev) {
        opts.rev = req.query.rev; 
      }
      if (req.query.open_revs) {
        opts.open_revs = req.query.open_revs; 
      }

      const doc = await adapter.get(req.params.docId, opts);
      res.json(doc);
    } catch (err) {
      sendError(res, err);
    }
  };

  // Put document
  const putDoc = async (req, res) => {
    try {
      const adapter = getAdapter(req);
      const doc = { ...req.body, _id: req.params.docId };
      const result = await adapter.put(doc);
      res.status(201).json(result);
    } catch (err) {
      sendError(res, err);
    }
  };

  // Delete document
  const deleteDoc = async (req, res) => {
    try {
      const adapter = getAdapter(req);
      const result = await adapter.remove(req.params.docId, req.query.rev);
      res.json(result);
    } catch (err) {
      sendError(res, err);
    }
  };

  // All docs
  const allDocs = async (req, res) => {
    try {
      const adapter = getAdapter(req);
      const opts = parseViewOpts(req);
      if (req.body?.keys) {
        opts.keys = req.body.keys; 
      }
      const result = await adapter.allDocs(opts);
      res.json(result);
    } catch (err) {
      sendError(res, err);
    }
  };

  // Bulk docs
  const bulkDocs = async (req, res) => {
    try {
      const adapter = getAdapter(req);
      const docs = req.body?.docs || [];
      const opts = {};
      if (req.body?.new_edits === false) {
        opts.new_edits = false; 
      }
      const result = await adapter.bulkDocs(docs, opts);
      res.status(201).json(result);
    } catch (err) {
      sendError(res, err);
    }
  };

  // Bulk get
  const bulkGet = async (req, res) => {
    try {
      const adapter = getAdapter(req);
      const opts = {
        docs: req.body?.docs || [],
        revs: req.query.revs === 'true',
        attachments: req.query.attachments === 'true',
      };
      const result = await adapter.bulkGet(opts);
      // Remove attachment entries without proper data+digest — PouchDB crashes without these
      for (const r of result.results) {
        for (const d of r.docs) {
          if (d.ok?._attachments) {
            for (const [name, att] of Object.entries(d.ok._attachments)) {
              if (!att.data || !att.digest) {
                delete d.ok._attachments[name];
              }
            }
            if (Object.keys(d.ok._attachments).length === 0) {
              delete d.ok._attachments;
            }
          }
        }
      }
      res.json(result);
    } catch (err) {
      sendError(res, err);
    }
  };

  // Changes feed
  const changesHandler = async (req, res) => {
    res.set('Cache-Control', 'no-cache, no-store');
    try {
      const adapter = getAdapter(req);
      const opts = {
        since: parseSince(req.query.since || req.body?.since),
        limit: parseInt(req.query.limit || req.body?.limit, 10) || undefined,
        include_docs: (req.query.include_docs || req.body?.include_docs) === 'true',
      };
      if (req.body?.doc_ids) {
        opts.doc_ids = req.body.doc_ids; 
      }
      if (req.query.doc_ids) {
        opts.doc_ids = JSON.parse(req.query.doc_ids); 
      }

      const feed = req.query.feed || req.body?.feed;

      if (feed === 'longpoll') {
        // Longpoll: wait for at least one change, then return
        const timeout = parseInt(req.query.timeout || '60000', 10);

        // First check if there are already changes
        const emitter = adapter.changes(opts);
        const result = await emitter;

        if (result.results.length > 0) {
          return res.json(result);
        }

        // No changes yet — wait for one via live feed
        const liveOpts = { ...opts, live: true, since: result.last_seq };
        const liveEmitter = adapter.changes(liveOpts);

        const timer = setTimeout(() => {
          liveEmitter.cancel();
          res.json({ results: [], last_seq: result.last_seq, pending: 0 });
        }, timeout);

        liveEmitter.on('change', (change) => {
          clearTimeout(timer);
          liveEmitter.cancel();
          res.json({ results: [change], last_seq: change.seq, pending: 0 });
        });

        liveEmitter.on('error', () => {
          clearTimeout(timer);
          res.json({ results: [], last_seq: result.last_seq, pending: 0 });
        });

        req.on('close', () => {
          clearTimeout(timer);
          liveEmitter.cancel();
        });

        return;
      }

      // Normal (non-longpoll) changes
      const emitter = adapter.changes(opts);
      const result = await emitter;
      res.json({ ...result, pending: 0 });
    } catch (err) {
      sendError(res, err);
    }
  };

  // Revs diff
  const revsDiff = async (req, res) => {
    try {
      const adapter = getAdapter(req);
      const result = await adapter.revsDiff(req.body);
      res.json(result);
    } catch (err) {
      sendError(res, err);
    }
  };

  // Local docs (replication checkpoints)
  const getLocalDoc = async (req, res) => {
    try {
      const adapter = getAdapter(req);
      const localId = buildLocalId(req);
      const doc = await adapter.getLocal(localId);
      res.json(doc);
    } catch (err) {
      sendError(res, err);
    }
  };

  const putLocalDoc = async (req, res) => {
    try {
      const adapter = getAdapter(req);
      const localId = buildLocalId(req);
      const doc = { ...req.body, _id: `_local/${localId}` };
      const result = await adapter.putLocal(doc);
      res.status(201).json(result);
    } catch (err) {
      sendError(res, err);
    }
  };

  const deleteLocalDoc = async (req, res) => {
    try {
      const adapter = getAdapter(req);
      const localId = buildLocalId(req);
      const result = await adapter.deleteLocal(localId);
      res.json(result);
    } catch (err) {
      sendError(res, err);
    }
  };

  // View queries
  const viewQuery = async (req, res) => {
    try {
      const adapter = getAdapter(req);
      const designDoc = req.params.designDoc;
      const viewName = req.params.viewName;
      const opts = parseViewOpts(req);
      if (req.body?.keys) {
        opts.keys = req.body.keys; 
      }
      const result = await adapter.query(`${designDoc}/${viewName}`, opts);
      res.json(result);
    } catch (err) {
      sendError(res, err);
    }
  };

  // Get attachment
  const getAttachment = async (req, res) => {
    try {
      const adapter = getAdapter(req);
      const data = await adapter.getAttachment(req.params.docId, req.params.attName);
      if (data) {
        const doc = await adapter.get(req.params.docId);
        const att = doc._attachments?.[req.params.attName];
        res.set('Content-Type', att?.content_type || 'application/octet-stream');
        const buf = data?.buffer ? data.buffer : (Buffer.isBuffer(data) ? data : Buffer.from(data));
        res.send(buf);
      } else {
        res.status(404).json({ error: 'not_found', reason: 'missing' });
      }
    } catch (err) {
      sendError(res, err);
    }
  };

  // No-ops
  const ensureFullCommit = (req, res) => {
    res.status(201).json({ ok: true, instance_start_time: '0' });
  };

  const compact = (req, res) => {
    res.json({ ok: true });
  };

  return {
    dbInfo,
    getDoc,
    putDoc,
    deleteDoc,
    allDocs,
    bulkDocs,
    bulkGet,
    changes: changesHandler,
    revsDiff,
    getLocalDoc,
    putLocalDoc,
    deleteLocalDoc,
    viewQuery,
    getAttachment,
    ensureFullCommit,
    compact,
  };
};

// --- Helpers ---

const buildLocalId = (req) => {
  const parts = [req.params.localId];
  if (req.params.rest) {
    parts.push(req.params.rest); 
  }
  return parts.join('/');
};

const parseSince = (since) => {
  if (since === undefined || since === null || since === '') {
    return 0; 
  }
  if (since === 'now') {
    return 'now'; 
  }
  const n = Number(since);
  return isNaN(n) ? since : n;
};

const parseViewOpts = (req) => {
  const opts = {};
  const q = { ...req.query, ...(req.body || {}) };

  if (q.include_docs === 'true' || q.include_docs === true) {
    opts.include_docs = true; 
  }
  if (q.reduce === 'true' || q.reduce === true) {
    opts.reduce = true; 
  }
  if (q.reduce === 'false' || q.reduce === false) {
    opts.reduce = false; 
  }
  if (q.group === 'true' || q.group === true) {
    opts.group = true; 
  }
  if (q.group_level !== undefined) {
    opts.group_level = parseInt(q.group_level, 10); 
  }
  if (q.descending === 'true') {
    opts.descending = true; 
  }
  if (q.inclusive_end === 'false') {
    opts.inclusive_end = false; 
  }
  if (q.limit !== undefined) {
    opts.limit = parseInt(q.limit, 10); 
  }
  if (q.skip !== undefined) {
    opts.skip = parseInt(q.skip, 10); 
  }
  if (q.key !== undefined) {
    opts.key = JSON.parse(q.key); 
  }
  if (q.keys !== undefined && typeof q.keys === 'string') {
    opts.keys = JSON.parse(q.keys); 
  }
  if (q.startkey !== undefined) {
    opts.startkey = JSON.parse(q.startkey); 
  }
  if (q.endkey !== undefined) {
    opts.endkey = JSON.parse(q.endkey); 
  }
  if (q.start_key !== undefined) {
    opts.startkey = JSON.parse(q.start_key); 
  }
  if (q.end_key !== undefined) {
    opts.endkey = JSON.parse(q.end_key); 
  }
  if (q.attachments === 'true') {
    opts.attachments = true; 
  }

  return opts;
};

const sendError = (res, err) => {
  const status = err.status || 500;
  res.status(status).json({
    error: err.name || 'error',
    reason: err.reason || err.message || 'unknown error',
  });
};

module.exports = { createHandlers };
