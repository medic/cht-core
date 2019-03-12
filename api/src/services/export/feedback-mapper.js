const db = require('../../db');
const ALL_META_DB = 'medic-all-meta';

const safeStringify = obj => {
  try {
    return JSON.stringify(obj).replace(/,/g, '\\,');
  } catch (e) {
    return obj;
  }
};

module.exports = {
  dbName: ALL_META_DB,
  getDocIds: (options) => {
    options.include_docs = false; 
    options.endkey = 'feedback-';
    options.startkey = 'feedback-\ufff0';
    options.descending = true;
    return db.get(ALL_META_DB).allDocs(options)
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
