const moment = require('moment');
const db = require('../../db');

const formatDate = (date, filters) => {
  if (!date) {
    return '';
  }
  if (filters && filters.human && filters.human === 'true'){
    return moment(date).toISOString();
  } else {
    return moment(date).valueOf();
  }
};

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
  map: (filters) => {
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
          formatDate(doc.meta.time, filters),
          doc.meta.user.name,
          doc.meta.version,
          doc.meta.url,
          safeStringify(doc.info),
        ]];
      }
    });
  }
};
