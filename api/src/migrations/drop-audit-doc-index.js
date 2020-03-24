const db = require('../db');
const { promisify } = require('util');
const async = require('async');
const logger = require('../logger');
const _ = require('lodash');
const environment = require('../environment');
const DDOC_ID = '_design/medic';
const BATCH_SIZE = 100;
const AUDIT_ID_SUFFIX = '-audit';

const dropView = function(auditDb, callback) {
  auditDb.get(DDOC_ID, function(err, ddoc) {
    if (err) {
      return callback(err);
    }
    delete ddoc.views;
    auditDb.put(ddoc, callback);
  });
};

const needsUpdate = function(row) {
  return (
    row.doc.type === 'audit_record' && row.doc.record_id // is an audit doc, and
  ); // has old property
};

const getAuditId = function(doc) {
  return doc.record_id + AUDIT_ID_SUFFIX;
};

const getRecordId = function(doc) {
  return doc._id.slice(0, -AUDIT_ID_SUFFIX.length);
};

const mergeHistory = function(docs) {
  let result;
  docs.forEach(function(doc) {
    if (!result) {
      result = doc;
    } else {
      result.history = result.history.concat(doc.history);
    }
  });
  result.history = _.sortBy(result.history, 'timestamp');
  return result;
};

const mergeDupes = function(oldDocs) {
  const grouped = _.groupBy(oldDocs, 'record_id');
  return _.values(grouped).map(function(group) {
    if (group.length === 1) {
      return group[0];
    }
    return mergeHistory(group);
  });
};

const createNewDocs = function(auditDb, oldDocs, callback) {
  const merged = mergeDupes(oldDocs);
  const ids = merged.map(getAuditId);
  auditDb.allDocs({ keys: ids, include_docs: true }, function(err, results) {
    if (err) {
      return callback(err);
    }
    const found = results.rows.filter(function(row) {
      return row.doc;
    });
    found.forEach(function(row) {
      const dupe = _.find(merged, { record_id: getRecordId(row.doc) });
      dupe.history = mergeHistory([dupe, row.doc]).history;
      dupe.auditRev = row.doc._rev;
    });
    const newDocs = merged.map(function(doc) {
      return {
        _id: getAuditId(doc),
        _rev: doc.auditRev,
        type: 'audit_record',
        history: doc.history,
      };
    });
    auditDb.bulkDocs(newDocs, callback);
  });
};

const deleteOldDocs = function(auditDb, oldDocs, callback) {
  oldDocs.forEach(function(doc) {
    doc._deleted = true;
  });
  auditDb.bulkDocs(oldDocs, callback);
};

const changeDocIdsBatch = function(auditDb, skip, callback) {
  const options = {
    include_docs: true,
    limit: BATCH_SIZE,
    skip: skip,
  };
  auditDb.allDocs(options, function(err, result) {
    if (err) {
      return callback(err);
    }
    if (!result.rows || !result.rows.length) {
      // we've reached the end of the database!
      return callback(null, null, false);
    }
    logger.info(`        Processing ${skip} to (${skip + BATCH_SIZE}) docs of ${result.total_rows} total`);
    const oldDocs = result.rows.filter(needsUpdate).map(function(row) {
      return row.doc;
    });
    if (!oldDocs.length) {
      // no old docs in this batch
      return callback(null, skip + BATCH_SIZE, true);
    }
    createNewDocs(auditDb, oldDocs, function(err) {
      if (err) {
        return callback(err);
      }
      deleteOldDocs(auditDb, oldDocs, function(err) {
        if (err) {
          return callback(err);
        }
        // The newSkip is based on the old skip, plus the number of
        // unchanged docs. Changed docs can't be included because
        // they have just been deleted so will not be included in the
        // next query result. This means some docs will be processed
        // more than once but gaurantees every doc will be processed
        // at least once.
        const newSkip = skip + BATCH_SIZE - oldDocs.length;
        callback(null, newSkip, true);
      });
    });
  });
};

const changeDocIds = function(auditDb, callback) {
  let skip = 0;
  let again = true;
  async.doWhilst(
    function(callback) {
      changeDocIdsBatch(auditDb, skip, function(err, _skip, _again) {
        if (err) {
          return callback(err);
        }
        skip = _skip;
        again = _again;
        callback();
      });
    },
    function(cb) {
      return cb(null, again);
    },
    callback
  );
};

module.exports = {
  name: 'drop-audit-doc-index',
  created: new Date(2016, 11, 1),
  run: promisify(function(callback) {
    const auditDb = db.get(environment.db + '-audit');
    const closeCallback = (err, result) => {
      db.close(auditDb);
      callback(err, result);
    };
    dropView(auditDb, function(err) {
      if (err) {
        return closeCallback(err);
      }
      changeDocIds(auditDb, closeCallback);
    });
  }),
};
