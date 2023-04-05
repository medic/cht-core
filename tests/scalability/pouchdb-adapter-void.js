const uuid = require('uuid').v4;

// leveldb barks if we try to open a db multiple times
// so we cache opened connections here for initstore()
const dbs = new Map();

function PouchError(status, error, reason) {
  Error.call(this, reason);
  this.status = status;
  this.name = error;
  this.message = reason;
  this.error = true;
}

function VoidPouch(opts, callback) {
  const api = this;
  const db = {
    name: opts.name,
    _docCount: -1,
    instanceId: uuid(),
    local_store: new Map(),
  };
  dbs.set(db.name, db);

  api._remote = false;
  api.type = function () {
    return 'voiddb';
  };

  api._id = function (callback) {
    callback(null, db.instanceId);
  };

  api._info = function (callback) {
    callback(null, {
      db_name: db.name,
      purge_seq: 0,
      update_seq: db._docCount,
      doc_count: db._docCount,
    });
  };

  api._get = function (id, opts, callback) {
    callback = callback || opts;
    callback(new PouchError(404, 'not found', 'missing'));
  };

  api._getAttachment = function (docId, attachId, attachment, opts, callback) {
    callback = callback || opts;
    callback(null, {});
  };

  api._bulkDocs = function (req, opts, callback) {
    callback = callback || opts;
    callback(null, []);
  };

  api._allDocs = function (opts, callback) {
    callback(null, { rows: [] });
  };

  api._changes = function () {
    callback(null, { results: [] });
  };

  api._close = function (callback) {
    dbs.delete(db.name);
    callback();
  };

  api._getLocal = function (id, callback) {
    if (db.local_store.has(id)) {
      callback(null, db.local_store.get(id));
    } else {
      callback(new PouchError(404, 'not found'));
    }
  };

  api._putLocal = function (doc, opts, callback) {
    callback = callback || opts;
    db.local_store.set(doc._id, doc);
    callback && callback();
  };

  api._destroy = function (opts, callback) {
    callback = callback || opts;
    dbs.delete(db.name);
    callback && callback();
  };

  api._getRevisionTree = function (id, callback) {
    callback(new PouchError(404, 'not found', 'missing'));
  };

  callback && callback();
}

VoidPouch.valid = () => true;
VoidPouch.use_prefix = false;

module.exports = function(PouchDb) {
  PouchDb.adapter('void', VoidPouch, true);
};
