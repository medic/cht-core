var _ = require('underscore');

/**
 * When district or health center doc gets updated, follow chain down to update
 * children.
 */
module.exports = {
  required_fields: 'type parent',
  onMatch: function(change) {
    var doc = change.doc
        , view = 'facility_by_parent'
        , q = {startkey:[doc._id], endkey:[doc._id, {}], include_docs:true}
        , self = this;

    var k = [doc.name, doc.type, doc._id];

    if (doc.type !== 'health_center' && doc.type !== 'district_hospital')
        return self.complete(null, false);

    self.db.view('kujua-sentinel', view, q, function(err, data) {

        if (err) return self.complete(err);

        for (var i in data.rows) {
            var d = data.rows[i].doc;
            if (d.parent._id === doc._id && d.parent._rev === doc._rev)
                return self.complete(null, false);
            d.parent = doc;
            self.db.saveDoc(d, function(err, ok) {
              if (err) {
                  //not sure why this throws, but causes sentinel to die, bad?
                  return self.complete(err);
              } else {
                return self.complete(null, false);
              }
            });
        }

    });

  }
}
