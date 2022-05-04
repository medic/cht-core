const auth = require('../auth');
const db = require('../db');

const createLog = (request, entity) => {
  return auth
    .getUserCtx(request)
    .then(({ name }) => {
      const datetime = new Date().getTime();
      return db.medicLogs
        .put({
          _id: 'bulk-' + entity + '-upload-' + datetime,
          bulk_uploaded_by: name,
          bulk_uploaded_on: datetime,
          progress: {
            status: 'initiated'
          },
          data: {}
        })
        .then(doc => doc.id);
    });
};

const updateProgress = async (id, progress) => {
  const doc = await db.medicLogs.get(id);
  doc.progress = Object.assign(doc.progress, progress);
  return db.medicLogs.put(doc);
};

const updateData = (id, data) => {
  return db.medicLogs
    .get(id)
    .then(doc => {
      // eslint-disable-next-line no-console
      console.warn('data', doc.progress);
      Object.assign(doc.progress, data);
      // eslint-disable-next-line no-console
      console.warn('data after', doc.progress);
      return db.medicLogs.put(doc);
    });
};

module.exports = {
  createLog,
  updateProgress,
  updateData,
};
