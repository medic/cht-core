var async = require('async'),
    db = require('../db'),
    people = require('../controllers/people'),
    places = require('../controllers/places');

var extract = function(row, callback) {
  db.medic.get(row.id, function(err, facility) {
    if (err) {
      if (err.statusCode === 404) {
        return callback();
      }
      return callback(err);
    }
    if (!facility.contact) {
      // no contact to migrate
      return callback();
    }
    if (facility.contact._id) {
      // already migrated
      return callback();
    }
    people.createPerson(
      {
        name: facility.contact.name,
        phone: facility.contact.phone,
        place: facility._id
      },
      function(err, result) {
        if (err) {
          return callback(err);
        }
        places.updatePlace(facility._id, { contact: result.id },
          function(err, result) {
            if (err) {
              console.error('Failed to update contact on facility', facility._id);
            }
            callback(err, result);
        });
      });
  });
};

module.exports = {
  name: 'extract-person-contacts',
  created: new Date(2015, 3, 16, 17, 6, 0, 0),
  run: function(callback) {
    db.medic.view('medic', 'facilities', { }, function(err, result) {
      if (err) {
        return callback(err);
      }
      async.eachSeries(result.rows, extract, callback);
    });
  }
};