var async = require('async'),
    db = require('../db'),
    people = require('../controllers/people'),
    places = require('../controllers/places');

/**
 * This migration updates old-style contacts (`contact: { name:..., phone: ...}`) to new-style contacts
 * (`contact: {_id:..., name:..., phone: ..., parent: ...}`).
 * It updates them all the way up the parent chain inside each doc.
 * How it works :
 * - migrate in hierarchical order : district_hospitals, then health_centers, then clinics
 * - for each place, replace the `parent` field by the content of the current parent doc :
 * this updates contacts in the `parent` field.
 * - update the contact for the place : create a corresponding `person` doc, and assign it to the
 * `contact` field.
 */

var createPerson = function(id, callback) {
  var checkContact = function(facility, callback) {
    if (!facility.contact) {
      // no contact to migrate
      return callback({ skip: true });
    }
    if (facility.contact._id) {
      // already migrated
      return callback({ skip: true });
    }
    callback();
  };

  // Remove old-style contact, so that the created `person`'s `parent.contact` is blank.
  var removeContact = function(facility, callback) {
    var oldContact = facility.contact;
    delete facility.contact;
    db.medic.insert(facility, function(err) {
      if (err) {
        return callback(new Error('Failed to delete contact on facility ' + facility._id +
          JSON.stringify(err, null, 2)));
      }
      callback(null, oldContact);
    });
  };

  // Create a separate person doc to represent the contact.
  var createPerson = function(facilityId, oldContact, callback) {
    people.createPerson(
      {
        name: oldContact.name,
        phone: oldContact.phone,
        place: facilityId
      },
      function(err, result) {
        if (err) {
          // TODO : reset the contact : facility.contact = oldContact.
          return callback(new Error('Could not create person. Facility ' + facilityId +
            ' got its contact deleted, put it back!\n' + oldContact + '\n' +
            JSON.stringify(err, null, 2)));
        }
        callback(null, result.id);
    });
  };

  // Re-set the contact : this time use the newly created `person` doc.
  var resetContact = function(facilityId, personId, callback) {
    places.updatePlace(facilityId, { contact: personId },
      function(err) {
        if (err) {
          return callback(new Error('Failed to update contact on facility ' + facilityId +
            JSON.stringify(err, null, 2)));
        }
        callback();
    });
  };

  db.medic.get(id, function(err, facility) {
    if (err) {
      if (err.statusCode === 404) {
        return callback(new Error('facility ' + facility._id + ' not found.'));
      }
      return callback(err);
    }

    async.waterfall(
      [
        async.apply(checkContact, facility),
        async.apply(removeContact, facility),
        async.apply(createPerson, facility._id /* oldContact passed from waterfall */),
        async.apply(resetContact, facility._id /* parentId passed from waterfall */)
      ],
      function(err) {
        if (err && !err.skip) {
          return callback(err);
        }
        return callback();
    });
  });
};


// For a given doc, update its parent to the latest version of the parent doc.
// Note that since we migrate in order of depth, the grandparents will be already updated.
var updateParents = function(id, callback) {
  var checkParent = function(facility, callback) {
    if (!facility.parent || (Object.keys(facility.parent).length === 0)) { // tmp should we remove the empty parents?
      // No parent.
      return callback({ skip: true });
    }

    var parentId = facility.parent._id;
    if (!parentId) {
      return callback(new Error('facility ' + facility._id + ' has a parent without an _id.'));
    }

    if (!facility.parent.contact || !!facility.parent.contact._id) {
      // No contact, or already migrated.
      return callback({ skip: true });
    }

    // Check the parent exists before doing anything crazy.
    db.medic.get(facility.parent._id, function(err) {
      if (err) {
        if (err.statusCode === 404) {
          return callback(new Error('Parent ' + facility.parent._id +
           ' of facility ' + facility._id + ' not found.'));
        }
        return callback(err);
      }
      return callback();
    });
  };

  var removeParent = function(facility, callback) {
    var parentId = facility.parent._id;
    delete facility.parent;
    db.medic.insert(facility, function(err) {
      if (err) {
        return callback(new Error('Failed to delete parent on facility ' + facility._id + ' - ' +
          JSON.stringify(err, null, 2)));
      }
      return callback(null, parentId);
    });
  };

  var resetParent = function(facilityId, parentId, callback) {
    places.updatePlace(facilityId, { parent: parentId },
      function(err) {
        if (err) {
          return callback(new Error('Failed to update parent on facility ' + facilityId + ' - ' +
            JSON.stringify(err, null, 2)));
        }
        return callback();
    });
  };

  db.medic.get(id, function(err, facility) {
    if (err) {
      if (err.statusCode === 404) {
        return callback(new Error('facility ' + facility._id + ' not found.'));
      }
      return callback(err);
    }

    async.waterfall(
      [
        async.apply(checkParent, facility),
        async.apply(removeParent, facility),
        async.apply(resetParent, facility._id /* parentId passed from waterfall */)
      ],
      function(err) {
        if (err && !err.skip) {
          return callback(err);
        }
        return callback();
      });
    });
};

var migrateOneType = function(type, callback) {
  var migrate = function(row, callback) {
    updateParents(row.id, function(err) {
      if (err) {
        return callback(err);
      }
      createPerson(row.id, callback);
    });
  };

  db.medic.view(
    'medic',
    'contacts_by_type',
    { key: [ type ] },
    function(err, result) {
      if (err) {
        return callback(err);
      }
      async.eachSeries(result.rows, migrate, callback);
    });
};

module.exports = {
  name: 'extract-person-contacts',
  created: new Date(2015, 3, 16, 17, 6, 0, 0),
  run: function(callback) {
    var types = ['district_hospital', 'health_center', 'clinic'];
    async.eachSeries(types, migrateOneType, callback);
  }
};
