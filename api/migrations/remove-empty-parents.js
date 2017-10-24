var db = require('../db');

var emptyParentsView = function(doc) {
  if (['district_hospital', 'health_center', 'clinic', 'person'].indexOf(doc.type) === -1 ||
      typeof doc.parent === 'undefined' ||
      (doc.parent && Object.keys(doc.parent).length)) {
    return;
  }
  emit();
};

var removeEmptyParents = function(docs, callback) {
  docs.forEach(function(doc) {
    delete doc.parent;
  });

  db.medic.bulk({
    docs: docs
  }, callback);
};

module.exports = {
  name: 'remove-empty-parents',
  created: new Date(2016, 7, 10, 13, 37, 0, 0),
  run: function(callback) {
    db.getCouchDbVersion(function(err, version) {
      if (err) {
        return callback(err);
      }

      if (version.major === '1') {
        db.request({
          db: 'medic',
          method: 'POST',
          path: '_temp_view',
          body: { map: emptyParentsView.toString() },
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

          removeEmptyParents(docs, callback);
        });
      } else {
        db.request({
          db: 'medic',
          method: 'POST',
          path: '_find',
          body: {
            selector: {
              type: {
                $in: ['district_hospital', 'health_center', 'clinic', 'person']
              },
              $or: [
              {
                parent: {
                  $eq: null
                }
              },
              {
                parent: {
                  $exists: true,
                  _id: {
                    $exists: false
                  }
                }
              }]
            }
          }
        }, function(err, result) {
          if (err) {
            return callback(err);
          }

          removeEmptyParents(result.docs, callback);
        });
      }
    });
  }
};
