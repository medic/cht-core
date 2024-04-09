const db = require('../db');
const logger = require('../logger');

const BATCH_SIZE = 100;

const getUserSettingsDocs = async (skip = 0) => {
  const options = {
    include_docs: true,
    limit: BATCH_SIZE,
    key: ['user-settings'],
    skip,
  };
  return (await db.medic.query('medic-client/doc_by_type', options))
    .rows
    .map(row => row.doc);
};

const getUpdatedUserDoc = (userSettingsDocs) => (userDoc, index) => {
  const { _id, contact_id } = userSettingsDocs[index];
  if (!userDoc) {
    logger.warn(`Could not find user with id "${_id}". Skipping it.`);
    return null;
  }
  return { ...userDoc, contact_id };
};

const updateUsersDatabase = async (userSettingsDocs) => {
  const allDocsOptions = {
    include_docs: true,
    keys: userSettingsDocs.map(doc => doc._id),
  };
  const updatedUsersDocs = (await db.users.allDocs(allDocsOptions))
    .rows
    .map(row => row.doc)
    .map(getUpdatedUserDoc(userSettingsDocs))
    .filter(Boolean);
  await db.users.bulkDocs(updatedUsersDocs);
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
