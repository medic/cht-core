const db = require('./libs/db');

const createLog = (user, entity) => {
  const datetime = new Date();
  return db.medicLogs
    .put({
      _id: 'bulk-' + entity + '-upload-' + datetime.getTime(),
      bulk_uploaded_by: user.name,
      bulk_uploaded_on: datetime.toISOString(),
      progress: {
        status: 'initiated'
      },
      data: {}
    })
    .then(doc => doc.id);
};

const updateLog = (id, progress, data) => {
  return db.medicLogs
    .get(id)
    .then(doc => {
      doc.progress = Object.assign(doc.progress, progress);
      doc.data = data;
      return db.medicLogs.put(doc);
    })
    .catch(error => {
      if (error.status !== 404) {
        // calls to POST /api/v1/users don't create a log
        throw error;
      }
    });
};

module.exports = {
  createLog,
  updateLog,
};
