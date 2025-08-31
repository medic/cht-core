const db = require('../db');
const logger = require('@medic/logger');

const BATCH_SIZE = 100;

const getUserSettingsDocs = async (skip) => {
  const result = await db.medic.allDocs({
    startkey: 'org.couchdb.user:',
    endkey: 'org.couchdb.user:\uffff',
    limit: BATCH_SIZE,
    skip,
    include_docs: true
  });

  return result.rows.map(row => row.doc);
};

const getUpdatedUserDoc = (userSettingsDocs) => (userDoc, index) => {
  const { _id, contact_id } = userSettingsDocs[index];
  if (userDoc) {
    return { ...userDoc, contact_id };
  }
  logger.warn(`Could not find user with id "${_id}". Skipping it.`);
};

const updateUsersDatabase = async (userSettingsDocs) => {
  const { rows } = await db.users.allDocs({
    include_docs: true,
    keys: userSettingsDocs.map(doc => doc._id),
  });

  const updatedUsersDocs = rows
    .map(({ doc }) => doc)
    .map(getUpdatedUserDoc(userSettingsDocs))
    .filter(Boolean);

  if (!updatedUsersDocs.length) {
    return;
  }

  return db.users.bulkDocs(updatedUsersDocs);
};

const runBatch = async (skip = 0) => {
  const userSettingsDocs = await getUserSettingsDocs(skip);
  if (!userSettingsDocs.length) {
    return;
  }

  await updateUsersDatabase(userSettingsDocs);

  if (userSettingsDocs.length < BATCH_SIZE) {
    return;
  }

  return runBatch(skip + BATCH_SIZE);
};

module.exports = {
  name: 'add-contact-id-to-user-docs',
  created: new Date(2024, 5, 2),
  run: runBatch,
};
