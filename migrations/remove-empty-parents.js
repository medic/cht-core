var _ = require('underscore'),
    async = require('async'),
    db = require('../db');

function removeDeadParents(row, callback) {
  if(row.doc.parent && !_.isEmpty(row.doc.parent)) {
    return callback();
  }
  delete row.doc.parent;
  db.medic.insert(row.doc, callback);
}

module.exports = {
  name: 'remove-empty-parents',
  created: new Date(2016, 7, 10, 13, 37, 0, 0),
  run: function(callback) {
    // pull full list of contacts, and remove dead parents
    db.medic.view(
      'medic-client',
      'contacts_by_type',
      { include_docs:true },
      function(err, result) {
        if (err) {
          return callback(err);
        }
        async.each(result.rows, removeDeadParents, callback);
      });
  }
};
