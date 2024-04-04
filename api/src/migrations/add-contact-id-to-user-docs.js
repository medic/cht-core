const db = require('../db');
const logger = require('../logger');

const BATCH_SIZE = 1;

const processDocument = async ({ _id, contact_id }) => {
  try {
    const user = await db.users.get(_id);
    user.contact_id = contact_id;
    await db.users.put(user);
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }
    logger.warn(`User with id "${_id}" does not exist anymore, skipping it.`);
  }
};

const runBatch = async (skip = 0) => {
  const options = {
    include_docs: true,
    limit: BATCH_SIZE,
    key: ['user-settings'],
    skip,
  };
  const { rows } = await db.medic.query('medic-client/doc_by_type', options);
  if (!rows.length) {
    return;
  }

  for (const row of rows) {
    await processDocument(row.doc);
  }

  if (rows.length < BATCH_SIZE) {
    return;
  }

  return runBatch(skip + BATCH_SIZE);
};

module.exports = {
  name: 'add-contact-id-to-user-docs',
  created: new Date(2024, 5, 2),
  run: runBatch,
};
