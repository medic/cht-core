/* global window */

const getFeedbackDocsByDb = async () => {
  return await browser.executeAsync(feedbackDocsReadScript);
};

const clearFeedbackDocs = async () => {
  const feedbackDocs = await getFeedbackDocsByDb();
  const deletes = {};
  for (const [dbName, rows] of Object.entries(feedbackDocs)) {
    deletes[dbName] = rows.map(row => (row.doc._deleted = true) && row.doc);
  }
  return await browser.executeAsync(feedbackDocDeleteScript, deletes);
};

const getFeedbackDocs = async () => {
  const feedbackDocs = await getFeedbackDocsByDb();
  return Object
    .values(feedbackDocs)
    .flat()
    .map(row => row.doc);
};

const feedbackDocDeleteScript = async (feedbackDocs, done) => {
  const results = {};
  for (const [dbName, docs] of Object.entries(feedbackDocs)) {
    // eslint-disable-next-line no-undef
    const metaDb = new PouchDB(dbName);
    results[dbName] = await metaDb.bulkDocs(docs);
  }
  done(results);
};

const feedbackDocsReadScript = async (done) => {
  // sometimes tests end when the user is _not_ on an angular page
  // eslint-disable-next-line no-undef
  if (!window.PouchDB) {
    return done(Promise.resolve([]));
  }
  // This is running inside the browser. indexedDB and PouchDB is available there.
  // eslint-disable-next-line no-undef
  const allDbList = await indexedDB.databases();
  const metaDbList = allDbList.filter(db => db.name.includes('pouch_medic-user') && db.name.endsWith('-meta'));
  const feedbackDocs = { };
  for (const metaDbName of metaDbList) {
    const nameStripped = metaDbName.name.replace('_pouch_', '');
    // eslint-disable-next-line no-undef
    const metaDb = new PouchDB(nameStripped);
    const result = await metaDb.allDocs({ include_docs: true, startkey: 'feedback-', endkey: 'feedback-\ufff0' });
    feedbackDocs[nameStripped] = result.rows;
  }
  done(feedbackDocs);
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

const createDocs = async (docs) => {
  const { err, result } = await browser.executeAsync((docs, callback) => {
    const db = window.CHTCore.DB.get();
    return db
      .bulkDocs(docs)
      .then(result => callback({ result }))
      .catch(err => callback({ err }));
  }, docs);

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
  clearFeedbackDocs,
  getFeedbackDocs,
  createDoc,
  updateDoc,
  getDoc,
  getDocs,
  deleteDoc,
  info,
  createDocs,
};
