var _ = require('underscore'),
    db = require('../../../../db');

module.exports = {
  name: 'extract-person-contacts',
  created: new Date(),
  run: function(callback) {
    db.medic.list({ include_docs:true }, function(err, body) {
      Promise.all(_.map(body.rows, function(row) {
          return new Promise(function(resolve, reject) {
            var doc = row.doc;
            if(doc._id.indexOf('_design/') === 0) { return resolve(); }
            doc.name = doc.name.split('').reverse().join('');
            db.medic.insert(doc, function(err) {
              if(err) { return reject(err); }
              resolve();
            });
          });
        }))
        .then(function() {
          callback();
        })
        .catch(callback);
    });
  }
};
