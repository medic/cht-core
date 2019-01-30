const moment = require('moment');
const db = require('../../db');
const MAX_CHARS = 32767; // libre office limit of chars per cell but it seems reasonable

const formatDate = date => {
  if (!date) {
    return '';
  }
  return moment(date).valueOf();
};

const safeStringify = obj => {
  try {
    return JSON.stringify(obj)
      .replace(/,/g, '.')
      .substring(0, MAX_CHARS);
      // .replace(/\n/g, '');
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
          formatDate(doc.meta.time),
          doc.meta.user.name,
          doc.meta.version,
          doc.meta.url,
          safeStringify(doc.info),
        ]];
      }
    });
  }
};
