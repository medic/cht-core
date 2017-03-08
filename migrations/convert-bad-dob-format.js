var db = require('../db'),
    moment = require('moment');

var map = function(doc) {
  if (doc.type === 'person' && doc.date_of_birth && doc.date_of_birth.indexOf(' ') >= 0) {
    emit(1);
  }
};
var temporaryView = {
  'map': map.toString()
};

var convertBadDobFormat = function(docs, callback) {
  docs.forEach(function(doc) {
    doc.date_of_birth = moment(doc.date_of_birth, 'MMM Do, YYYY').format('YYYY-MM-DD');
  });

  db.medic.bulk({
    docs: docs
  }, callback);
};

module.exports = {
  name: 'convert-bad-dob-format',
  created: new Date(2016, 4, 20),
  run: function(callback) {
    db.getCouchDbVersion(function(err, version) {
      if (err) {
        callback(err);
      }

      if (version.major === '1') {
        db.request({
          db: 'medic',
          method: 'POST',
          path: '_temp_view',
          body: temporaryView,
          qs: {
            include_docs: true,
          }
        }, function(err, result) {
          if (err) {
            return callback(err);
          }

          var docs = result.rows.map(function(row) {
            return row.doc;
          });

          convertBadDobFormat(docs, callback);
        });
      } else {
        db.request({
          db: 'medic',
          method: 'POST',
          path: '_find',
          body: {
            selector: {
              type: 'person',
              date_of_birth: {
                $regex: ' '
              }
            }
          }
        }, function(err, result) {
          if (err) {
            return callback(err);
          }

          convertBadDobFormat(result.docs, callback);
        });
      }
    });

  }
};
