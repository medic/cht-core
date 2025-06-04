const db = require('./libs/db');

/**
 * Creates a log entry in the database for a bulk upload operation.
 *
 * @param {Object} user - The user performing the bulk upload.
 * @param {string} user.name - The name of the user.
 * @param {string} entity - The entity type being uploaded.
 * @return {Promise<string>} A promise that resolves to the ID of the created log document.
 */
const createLog = async (user, entity) => {
  const datetime = new Date();
  const response = await db.medicLogs.put({
    _id: 'bulk-' + entity + '-upload-' + datetime.getTime(),
    bulk_uploaded_by: user.name,
    bulk_uploaded_on: datetime.toISOString(),
    progress: {
      status: 'initiated'
    },
    data: {}
  });
  return response.id;
};


/**
 * Updates a log in the database with the given progress and data.
 *
 * @param {string} id - The unique identifier of the log to update.
 * @param {Object} progress - An object representing the progress to merge with the existing progress.
 * @param {*} data - The data to update the log with.
 * @return {Promise}
 */
const updateLog = async (id, progress, data) => {
  if (!id) {
    return;
  }

  try {
    const doc = await db.medicLogs.get(id);
    doc.progress = { ...doc.progress, ...progress };
    doc.data = data;
    return await db.medicLogs.put(doc);
  } catch (error) {
    if (error.status !== 404) {
      // calls to POST /api/v1/users don't create a log
      throw error;
    }
  }
};


module.exports = {
  createLog,
  updateLog,
};
