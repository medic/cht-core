const fs = require('fs');

/* global window */

const feedBackDocs = async (testName = 'allLogs', existingDocIds = []) => {
  const feedBackDocs = await browser.executeAsync(feedBackDocsScript);
  const flattened = feedBackDocs.flat();
  const newDocIds = flattened.map(doc => existingDocIds.indexOf(doc.id) === -1);
  if (newDocIds && newDocIds.length > 0) {
    fs.writeFileSync(`./tests/logs/feedbackDocs-${testName}.json`, JSON.stringify(flattened, null, 2));
    return flattened.map(doc => doc.id);
  }
};

const feedBackDocsScript = async (done) => {
  // sometimes tests end when the user is _not_ on an angular page
  // eslint-disable-next-line no-undef
  if (!window.PouchDB) {
    return done(Promise.resolve([]));
  }
  // This is running inside the browser. indexedDB and PouchDB is available there.
  // eslint-disable-next-line no-undef
  const allDbList = await indexedDB.databases();
  const metaDbList = allDbList.filter(db => db.name.includes('pouch_medic-user') && db.name.endsWith('-meta'));
  done(Promise.all(metaDbList.map(async (db) => {
    const nameStripped = db.name.replace('_pouch_', '');
    // eslint-disable-next-line no-undef
    const metaDb = new PouchDB(nameStripped);
    const docs = await metaDb.allDocs({ include_docs: true, startkey: 'feedback-', endkey: 'feedback-\ufff0' });
    return docs.rows;
  })));
};

const getCookies = (...cookieNameList) => {
  return browser.getCookies(cookieNameList);
};

const createDoc = async (doc) => {
  const { err, result } = await browser.executeAsync((doc, callback) => {
    const db = window.CHTCore.DB.get();
    return db
      .put(doc)
      .then(result => callback({ result }))
      .catch(err => callback({ err }));
  }, doc);

  if (err) {
    throw err;
  }

  return result;
};

const updateDoc = async (docId, changes, overwrite = false) => {
  const { err, result } = await browser.executeAsync((docId, changes, overwrite, callback) => {
    const db = window.CHTCore.DB.get();
    return db
      .get(docId)
      .then(doc => {
        if (overwrite) {
          doc = { _rev: doc._rev, _id: doc._id };
        }

        Object.assign(doc, changes);
        return db.put(doc);
      })
      .then(result => callback({ result }))
      .catch(err => callback({ err }));
  }, docId, changes, overwrite);

  if (err) {
    throw err;
  }

  return result;
};

const getDoc = async (docId) => {
  const { err, result } = await browser.executeAsync((docId, callback) => {
    const db = window.CHTCore.DB.get();
    return db
      .get(docId, { conflicts: true })
      .then(result => callback({ result }))
      .catch(err => callback({ err }));
  }, docId);

  if (err) {
    throw err;
  }

  return result;
};

const deleteDoc = async (docId) => {
  const { err, result } = await browser.executeAsync((docId, callback) => {
    const db = window.CHTCore.DB.get();
    return db
      .get(docId)
      .then(doc => {
        doc._deleted = true;
        return db.put(doc);
      })
      .then(result => callback({ result }))
      .catch(err => callback({ err }));
  }, docId);

  if (err) {
    throw err;
  }

  return result;
};

const getDocs = async (docIds) => {
  const { err, result } = await browser.executeAsync((docIds, callback) => {
    const db = window.CHTCore.DB.get();
    return db
      .allDocs({ keys: docIds, include_docs: true })
      .then(response => callback({ result: response.rows.map(row => row.doc) }))
      .catch(err => callback({ err }));
  }, docIds);

  if (err) {
    throw err;
  }

  return result;
};

const info = async () => {
  const { err, result } = await browser.executeAsync((callback) => {
    const db = window.CHTCore.DB.get();
    return db
      .info()
      .then(response => callback({ result: response }))
      .catch(err => callback({ err }));
  });

  if (err) {
    throw err;
  }

  return result;
};

module.exports = {
  feedBackDocs,
  getCookies,
  createDoc,
  updateDoc,
  getDoc,
  getDocs,
  deleteDoc,
  info,
};
