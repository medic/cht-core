const db = require('../../db');

const safeStringify = obj => {
  try {
    return JSON.stringify(obj).replace(/,/g, '\\,');
  } catch (e) {
    return obj;
  }
};

module.exports = {
  getDocs: ids => {
    return db.medicUsersMeta.allDocs({ keys: ids, include_docs: true })
      .then(result => result.rows.map(row => row.doc));
  },
  getDocIds: (options) => {
    options.include_docs = false; 
    options.endkey = 'feedback-';
    options.startkey = 'feedback-\ufff0';
    options.descending = true;
    return db.medicUsersMeta.allDocs(options)
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
