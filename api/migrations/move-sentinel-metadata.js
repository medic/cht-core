const db = require('../db');

module.exports = {
  name: 'move-sentinel-metadata',
  created: new Date(2017, 09, 01, 16, 25, 54),
  run: function(callback) {
    db.medic.get('sentinel-meta-data', (err, doc) => {
      if (err && err.statusCode !== 404) {
        return callback(err);
      }

      if (doc) {
        const { _id, _rev } = doc;

        doc._id = '_local/sentinel-meta-data';
        delete doc._rev;

        db.medic.insert(doc, err => {
          if (err) {
            return callback(err);
          }

          db.medic.destroy(_id, _rev, callback);
        });
      } else {
        callback();
      }
    });
  }
};
