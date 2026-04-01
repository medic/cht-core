/**
 * Express router providing CouchDB HTTP API compatibility.
 *
 * Mount this on a database path to serve PouchDB HTTP adapter requests.
 *
 * Usage:
 *   const { createCouchRouter } = require('@medic/db-adapter/src/mongo/compat/couch-router');
 *   app.use('/medic', createCouchRouter(() => db.medic));
 */

const express = require('express');
const { createHandlers } = require('./couch-http-handler');

const createCouchRouter = (getAdapter) => {
  const router = express.Router();
  const jsonParser = express.json({ limit: '32mb' });
  const h = createHandlers(getAdapter);

  // Database info
  router.get('/', h.dbInfo);

  // Local docs (replication checkpoints) — must be before :docId
  router.get('/_local/:localId{/*rest}', h.getLocalDoc);
  router.put('/_local/:localId{/*rest}', jsonParser, h.putLocalDoc);
  router.delete('/_local/:localId{/*rest}', h.deleteLocalDoc);

  // Changes feed
  router.get('/_changes', h.changes);
  router.post('/_changes', jsonParser, h.changes);

  // All docs
  router.get('/_all_docs', h.allDocs);
  router.post('/_all_docs', jsonParser, h.allDocs);

  // Bulk operations
  router.post('/_bulk_docs', jsonParser, h.bulkDocs);
  router.post('/_bulk_get', jsonParser, h.bulkGet);

  // Revs diff (replication)
  router.post('/_revs_diff', jsonParser, h.revsDiff);

  // View queries
  router.get('/_design/:designDoc/_view/:viewName', h.viewQuery);
  router.post('/_design/:designDoc/_view/:viewName', jsonParser, h.viewQuery);

  // Maintenance no-ops
  router.post('/_ensure_full_commit', h.ensureFullCommit);
  router.post('/_compact', h.compact);
  router.post('/_view_cleanup', h.compact);
  router.post('/_missing_revs', jsonParser, h.revsDiff); // same logic as revs_diff

  // Design docs (served as regular documents)
  router.get('/_design/:designDoc', async (req, res) => {
    try {
      const doc = await getAdapter(req).get(`_design/${req.params.designDoc}`);
      res.json(doc);
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ error: err.name || 'error', reason: err.message });
    }
  });

  // Attachments — must be before single :docId
  router.get('/:docId/:attName', h.getAttachment);

  // Single document CRUD
  router.get('/:docId', h.getDoc);
  router.put('/:docId', jsonParser, h.putDoc);
  router.delete('/:docId', h.deleteDoc);

  return router;
};

module.exports = { createCouchRouter };
