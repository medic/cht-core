const db = require('../db-pouch'),
  logger = require('../lib/logger');

const infoDocId = id => id + '-info';

const getDocId = infoDocId => infoDocId.slice(0, -5);

const findInfoDoc = (database, change) => {
  return database.get(infoDocId(change.id)).catch(err => {
    if (err.status === 404) {
      return null;
    }
    throw err;
  });
};

const findInfoDocs = (database, changes) => {
  return database
    .allDocs({ keys: changes.map(change => infoDocId(change.id)), include_docs: true })
    .then(results => results.rows);
};

const getInfoDoc = change => {
  let rev = null;
  return findInfoDoc(db.sentinel, change)
    .then(doc => {
      if (doc) {
        return doc;
      }
      return findInfoDoc(db.medic, change).then(doc => {
        if (doc) {
          // prepare the doc for saving into the new db
          rev = doc._rev;
          delete doc._rev;
        }
        return doc;
      });
    })
    .then(doc => {
      if (doc) {
        doc.transitions = doc.transitions || change.doc.transitions || {};
        return doc;
      } else {
        return createInfoDoc(change.id, 'unknown');
      }
    })
    .then(doc => updateInfoDoc(doc, rev));
};

const createInfoDoc = (docId, initialReplicationDate) => {
  return {
    _id: infoDocId(docId),
    type: 'info',
    doc_id: docId,
    initial_replication_date: initialReplicationDate,
  };
};

const deleteInfoDoc = change => {
  return db.sentinel
    .get(infoDocId(change.id))
    .then(doc => {
      doc._deleted = true;
      return db.sentinel.put(doc);
    })
    .catch(err => {
      if (err.status !== 404) {
        throw err;
      }
    });
};

const updateInfoDoc = (doc, legacyRev) => {
  doc.latest_replication_date = new Date();
  return db.sentinel.put(doc).then(() => {
    if (legacyRev) {
      // Removes legacy info doc
      db.medic.remove(doc._id, legacyRev);
    }
    return doc;
  });
};

const updateTransition = (change, transition, ok) => {
  return findInfoDoc(db.sentinel, change).then(doc => {
    doc = doc || change.info;
    doc.transitions = doc.transitions || {};
    doc.transitions[transition] = {
      last_rev: change.doc._rev,
      seq: change.seq,
      ok: ok,
    };

    return db.sentinel.put(doc).catch(err => {
      logger.error('Error updating metaData: %o', err);
    });
  });
};

const bulkGet = changes => {
  const infoDocs = [];

  if (!changes || !changes.length) {
    return Promise.resolve();
  }

  return findInfoDocs(db.sentinel, changes)
    .then(result => {
      const missing = [];
      result.forEach(row => {
        if (!row.doc) {
          missing.push({ id: getDocId(row.key) });
        } else {
          infoDocs.push(row.doc);
        }
      });

      if (!missing.length) {
        return [];
      }

      return findInfoDocs(db.medic, missing);
    })
    .then(result => {
      result.forEach(row => {
        if (!row.doc) {
          infoDocs.push(createInfoDoc(getDocId(row.key), 'unknown'));
        } else {
          row.doc.legacy = true;
          infoDocs.push(row.doc);
        }
      });

      return infoDocs;
    });
};

const bulkUpdate = infoDocs => {
  const legacyDocs = [];

  if (!infoDocs || !infoDocs.length) {
    return Promise.resolve();
  }

  infoDocs.forEach(doc => {
    if (doc.legacy) {
      delete doc.legacy;
      legacyDocs.push(Object.assign({ _deleted: true }, doc));
      delete doc._rev;
    }

    doc.latest_replication_date = new Date();
  });

  return db.sentinel.bulkDocs(infoDocs).then(() => {
    if (legacyDocs.length) {
      return db.medic.bulkDocs(legacyDocs);
    }
  });
};

module.exports = {
  get: change => getInfoDoc(change),
  delete: change => deleteInfoDoc(change),
  updateTransition: (change, transition, ok) =>
    updateTransition(change, transition, ok),
  bulkGet: bulkGet,
  bulkUpdate: bulkUpdate
};
