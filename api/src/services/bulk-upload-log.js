const auth = require('../auth');
const db = require('../db');

const createLog = (request, entity) => {
  return auth
    .getUserCtx(request)
    .then(user => {
      const datetime = new Date().getTime();
      return db.medicLogs
        .put({
          _id: 'bulk-' + entity + '-upload-' + datetime,
          bulk_uploaded_by: user.name,
          bulk_uploaded_on: datetime,
          progress: {
            status: 'initiated'
          },
          data: {}
        })
        .then(doc => doc.id);
    });
};

const updateProgress = (id, progress) => {
  return db.medicLogs
    .get(id)
    .then(doc => {
      doc.progress = Object.assign(doc.progress, progress);
      return db.medicLogs.put(doc);
    });
};

const updateData = (id, data) => {
  return db.medicLogs
    .get(id)
    .then(doc => {
      doc.data = Object.assign(doc.data, data);
      return db.medicLogs.put(doc);
    });
};

module.exports = {
  createLog,
  updateProgress,
  updateData,
};
