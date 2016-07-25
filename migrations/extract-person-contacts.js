var async = require('async'),
    db = require('../db'),
    people = require('../controllers/people'),
    places = require('../controllers/places');

/**
 * WARNING : THIS MIGRATION IS POTENTIALLY DESTRUCTIVE IF IT MESSES UP HALFWAY, SO GET YOUR SYSTEM
 * OFFLINE BEFORE RUNNING IT!
 * See upgrade checklist : https://github.com/medic/medic-webapp/issues/2400
 *
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

/**
 * Migrates the `contact` of the facility from old style to new, and creates the corresponding `person` doc.
 * Before :
 * Facility :
 * {
 *    _id: ...,
 *    type: health_center,
 *    name: myfacility,
 *    contact: { name: Alice, phone: 123} // old-style contact
 *  }
 *
 * After :
 * Person is created:
 * {
 *    _id: ...,
 *    type: person,
 *    name: Alice,
 *    phone: 123,
 *    created_date: 12345678
 *    parent: { <contents of facility doc except facility.contact (no loops!)> }
 * }
 * Facility :
 * {
 *    _id: ...,
 *    name: myfacility,
 *    type: health_center,
 *    contact: { <contents of person doc> } // new-style contact
 *  }
 *
 * For creating the person, we use `people.createPerson` rather than db.medic.insert in order to set
 * `create_date` and any other necessary edits.
 * To set the parent of the new person, `people.createPerson` takes a place Id as argument, and
 * fetches the existing place doc to set it as parent. So we start by deleting the contact field from the
 * parent doc, and saving that doc, so that it can be used as parent for the new person.
 * Then we reset the contact field on that parent doc, with `places.updatePlace`.
 */
var createPerson = function(id, callback) {
  var checkContact = function(facility, callback) {
    if (!facility.contact || facility.contact._id) {
      // no contact to migrate or contact already migrated
      return callback({ skip: true });
    }
    callback();
  };

  // Remove old-style contact field from the facility, so that the `person` we will create will not have a
  // loop (`person.parent.contact = person`!).
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

  // Create a new person doc to represent the contact.
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
          // https://github.com/medic/medic-webapp/issues/2435
          return callback(new Error('Could not create person. Facility ' + facilityId +
            ' got its contact deleted, put it back!\n' + oldContact + '\n' +
            JSON.stringify(err, null, 2)));
        }
        callback(null, result.id);
    });
  };

  // Re-set the contact field in the facility : set it to the contents of the newly created `person` doc.
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
        return callback(new Error('facility ' + id + ' not found.'));
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
/**
 * Updates the `parent` of the facility, which can be outdated since we've migrated the parent's contact.
 * Before :
 * Facility :
 * {
 *    _id: ...,
 *    type: health_center,
 *    name: myfacility,
 *    parent: {
 *        _id: ...,
 *        type: district_hospital,
 *        name: myparent,
 *        contact: { name: Alice, phone: 123} // old-style contact
 *    }
 * }
 * Parent of the facility :
 * {
 *     _id: ...,
 *     type: district_hospital,
 *     name: myparent,
 *     contact: { // new-style contact
 *         _id: ...,
 *         type: person,
 *         name: Alice,
 *         phone: 123,
 *         created_date: 12345678
 *         parent: { ... }
 *     }
 * }
 *
 * After :
 * Facility :
 * {
 *    _id: ...,
 *    type: health_center,
 *    name: myfacility,
 *    parent: {
 *        _id: ...,
 *        type: district_hospital,
 *        name: myparent,
 *        contact: { // new-style contact
 *            _id: ...,
 *            type: person,
 *            name: Alice,
 *            phone: 123,
 *            created_date: 12345678
 *            parent: { ... }
 *        }
 *    }
 * }
 * Parent of the facility : unchanged.
 *
 */
var updateParents = function(id, callback) {
  var checkParent = function(facility, callback) {
    // Should we remove the empty parents?
    // https://github.com/medic/medic-webapp/issues/2436
    if (!facility.parent || (Object.keys(facility.parent).length === 0)) {
      return callback({ skip: true });
    }

    if (!facility.parent._id) {
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
        return callback(new Error('facility ' + id + ' not found.'));
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
    'medic-client',
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
