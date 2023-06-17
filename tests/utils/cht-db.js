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

const executeAsync = async (fn, ...args) => {
  // https://w3c.github.io/webdriver/#dfn-execute-async-script doesn't accept functions as params
  const fnString = fn.toString();
  const { err, result } = await browser.executeAsync((fnString, ...args) => {
    const fn = new Function(`const r = ${fnString}; return r`)();
    const callback = args.pop();
    return fn(...args)
      .then(result => callback({ result }))
      .catch(err => callback({ err }));
  }, fnString, ...args);

  if (err) {
    throw err;
  }

  return result;
};

const updateDoc = async (docId, changes, overwrite = false) => {
  return await executeAsync((docId, changes, overwrite) => {
    const db = window.CHTCore.DB.get();
    return db
      .get(docId)
      .then(doc => {
        if (overwrite) {
          doc = { _rev: doc._rev, _id: doc._id };
        }

        Object.assign(doc, changes);
        return db.put(doc);
      });
  }, docId, changes, overwrite);
};

const getDoc = async (docId) => {
  return await executeAsync((docId) => {
    return window.CHTCore.DB.get().get(docId, { conflicts: true });
  }, docId);
};

const deleteDoc = async (docId) => {
  return await executeAsync((docId) => {
    const db = window.CHTCore.DB.get();
    return db
      .get(docId)
      .then(doc => {
        doc._deleted = true;
        return db.put(doc);
      });
  }, docId);
};

const getDocs = async (docIds) => {
  return await executeAsync((docIds) => {
    const options = docIds ? { keys: docIds, include_docs: true, attachments: true } : {};
    return window.CHTCore.DB.get()
      .allDocs(options)
      .then(result => docIds ? result.rows.map(row => row.doc) : result.rows);
  }, docIds);
};

const info = async () => {
  return await executeAsync(() => window.CHTCore.DB.get().info());
};

module.exports = {
  feedBackDocs,
  createDoc,
  updateDoc,
  getDoc,
  getDocs,
  deleteDoc,
  info,
};
