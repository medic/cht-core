/* global window */

const getFeedbackDocsByDb = async () => {
  return await browser.execute(feedbackDocsReadScript);
};

const clearFeedbackDocs = async () => {
  const feedbackDocs = await getFeedbackDocsByDb();
  const deletes = {};
  for (const [dbName, rows] of Object.entries(feedbackDocs)) {
    deletes[dbName] = rows.map(row => {
      row.doc._deleted = true;
      return row.doc;
    });
  }
  return await browser.execute(feedbackDocDeleteScript, deletes);
};

const getFeedbackDocs = async () => {
  const feedbackDocs = await getFeedbackDocsByDb();
  return Object
    .values(feedbackDocs)
    .flat()
    .map(row => row.doc);
};

const feedbackDocDeleteScript = async (feedbackDocs) => {
  const results = {};
  for (const [dbName, docs] of Object.entries(feedbackDocs)) {
    // eslint-disable-next-line no-undef
    const metaDb = new PouchDB(dbName);
    results[dbName] = await metaDb.bulkDocs(docs);
  }
  return results;
};

const addReadDocsScript = async () => {
  const metaDb = window.CHTCore.DB.get({ meta: true });
  const docs = Array.from({ length: 1000 }).map((_, i) => ({ _id: `read:report:${i}` }));
  await metaDb.bulkDocs(docs);
};

const addReadDocs = async () => {
  return await browser.execute(addReadDocsScript);
};

const feedbackDocsReadScript = async () => {
  // sometimes tests end when the user is _not_ on an angular page
  if (!window.PouchDB) {
    return [];
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
  return feedbackDocs;
};

const createDoc = async (doc) => {
  return await browser.execute(async (doc) => {
    const db = window.CHTCore.DB.get();
    return await db.put(doc);
  }, doc);
};

const createDocs = async (docs) => {
  await browser.execute(async (docs) => {
    const db = window.CHTCore.DB.get();
    return await db.bulkDocs(docs);
  }, docs.map(doc => JSON.parse(JSON.stringify(doc))));
};

const updateDoc = async (docId, changes, overwrite = false) => {
  return await browser.execute(async (docId, changes, overwrite) => {
    const db = window.CHTCore.DB.get();
    let doc = await db.get(docId);
    if (overwrite) {
      doc = { _rev: doc._rev, _id: doc._id };
    }
    doc = { ...doc, ...changes};
    return await db.put(doc);
  }, docId, changes, overwrite);
};

const getDoc = async (docId, attachments = false) => {
  return await browser.execute(async (docId, attachments) => {
    return await window.CHTCore.DB.get().get(docId, { conflicts: true, attachments: attachments });
  }, docId, attachments);
};

const deleteDoc = async (docId) => {
  return await browser.execute(async (docId) => {
    const db = window.CHTCore.DB.get();
    const doc = await db.get(docId);
    doc._deleted = true;
    return await db.put(doc);
  }, docId);
};

const getDocs = async (docIds, params = {}) => {
  return await browser.execute(async (docIds, params) => {
    const options = docIds ? { keys: docIds, ...params } : { ...params };
    const result = await window.CHTCore.DB.get().allDocs(options);
    return result.rows;
  }, docIds, params);
};

const info = async () => {
  return await browser.execute(async () => await window.CHTCore.DB.get().info());
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
  addReadDocs,
};
