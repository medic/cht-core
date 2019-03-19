const db = require('../../db');

const safeStringify = obj => {
  try {
    return JSON.stringify(obj).replace(/,/g, '\\,');
  } catch (e) {
    return obj;
  }
};

module.exports = {
  getDocIds: (options) => {
    return db.medic.query('medic-admin/feedback', options)
      .then(result => result.rows.map(row => row.id));
  },
  map: () => {
    return Promise.resolve({
      header: [
        'id',
        'reported_date',
        'user',
        'app_version',
        'url',
        'info',
      ],
      getRows: doc => {
        return [[
          doc._id,
          doc.meta.time,
          doc.meta.user.name,
          doc.meta.version,
          doc.meta.url,
          safeStringify(doc.info),
        ]];
      }
    });
  }
};
