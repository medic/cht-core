const async = require('async');
const { promisify } = require('util');
const config = require('../config');
const db = require('../db');
const logger = require('../logger');
const { people, places } = require('@medic/contacts')(config, db);

// WARNING : THIS MIGRATION IS POTENTIALLY DESTRUCTIVE IF IT MESSES UP HALFWAY, SO GET YOUR SYSTEM
// OFFLINE BEFORE RUNNING IT!
// See upgrade checklist : https://github.com/medic/medic/issues/2400
//
// This migration updates old-style contacts (`contact: { name:..., phone: ...}`) to new-style contacts
// (`contact: {_id:..., name:..., phone: ..., parent: ...}`).
// It updates them all the way up the parent chain inside each doc.
// How it works :
// - migrate in hierarchical order : district_hospitals, then health_centers, then clinics
// - for each place, replace the `parent` field by the content of the current parent doc :
// this updates contacts in the `parent` field.
// - update the contact for the place : create a corresponding `person` doc, and assign it to the
// `contact` field.
// Migrates the `contact` of the facility from old style to new, and creates the corresponding `person` doc.
// Before :
// Facility :
// {
//    _id: ...,
//    type: health_center,
//    name: myfacility,
//    contact: { name: Alice, phone: 123} // old-style contact
//  }
//
// After :
// Person is created:
// {
//    _id: ...,
//    type: person,
//    name: Alice,
//    phone: 123,
//    created_date: 12345678
//    parent: { <contents of facility doc except facility.contact (no loops!)> }
// }
// Facility :
// {
//    _id: ...,
//    name: myfacility,
//    type: health_center,
//    contact: { <contents of person doc> } // new-style contact
//    // doc.contact.parent should actually contain the doc itself, but
//    // doc.contact.parent.contact should not be included
//  }
//
// For creating the person, we use `people.createPerson` rather than db.medic.insert in order to set
// `create_date` and any other necessary edits.
// To set the parent of the new person, `people.createPerson` takes a place Id as argument, and
// fetches the existing place doc to set it as parent. So we start by deleting the contact field from the
// parent doc, and saving that doc, so that it can be used as parent for the new person.
// Then we reset the contact field on that parent doc, with `places.updatePlace`.
const createPerson = function(id, callback) {
  const checkContact = function(facility, callback) {
    if (!facility.contact || facility.contact._id) {
      // no contact to migrate or contact already migrated
      return callback({ skip: true });
    }
    callback();
  };

  // Remove old-style contact field from the facility, so that the `person` we will create will not have a
  // loop (`person.parent.contact = person`!).
  const removeContact = function(facility, callback) {
    delete facility.contact;
    db.medic.put(facility, function(err) {
      if (err) {
        return callback(
          new Error(
            'Failed to delete contact on facility ' +
              facility._id +
              JSON.stringify(err, null, 2)
          )
        );
      }
      callback();
    });
  };

  // Create a new person doc to represent the contact.
  const createPerson = function(facilityId, oldContact, callback) {
    const person = {
      name: oldContact.name,
      phone: oldContact.phone,
      place: facilityId,
    };
    people
      .createPerson(person)
      .then(result => callback(null, result.id))
      .catch(err => {
        restoreContact(facilityId, oldContact, function() {
          callback(
            new Error(
              'Could not create person for facility ' +
                facilityId +
                ': ' +
                JSON.stringify(err, null, 2)
            )
          );
        });
      });
  };

  // Re-set the contact field in the facility : set it to the contents of the newly created `person` doc.
  const resetContact = function(facilityId, oldContact, personId, callback) {
    const updates = { contact: personId };
    if (oldContact.rc_code) {
      updates.place_id = oldContact.rc_code;
    }
    places
      .updatePlace(facilityId, updates)
      .then(() => callback())
      .catch(err => {
        restoreContact(facilityId, oldContact, function() {
          callback(
            new Error(
              'Failed to update contact on facility ' +
                facilityId +
                ': ' +
                JSON.stringify(err, null, 2)
            )
          );
        });
      });
  };

  const restoreContact = function(facilityId, oldContact, callback) {
    places
      .updatePlace(facilityId, { contact: oldContact })
      .then(() => callback())
      .catch(() => {
        // we tried our best - log the details and exit
        logger.error(`Failed to restore contact on facility "${facilityId}", contact: ${JSON.stringify(oldContact)}`);
      });
  };

  db.medic.get(id, function(err, facility) {
    if (err) {
      if (err.status === 404) {
        return callback(new Error('facility ' + id + ' not found.'));
      }
      return callback(err);
    }

    const oldContact = facility.contact;

    async.waterfall(
      [
        async.apply(checkContact, facility),
        async.apply(removeContact, facility),
        async.apply(createPerson, facility._id, oldContact),
        async.apply(
          resetContact,
          facility._id,
          oldContact /* parentId passed from waterfall */
        ),
      ],
      function(err) {
        if (err && !err.skip) {
          return callback(err);
        }
        return callback();
      }
    );
  });
};

// For a given doc, update its parent to the latest version of the parent doc.
// Note that since we migrate in order of depth, the grandparents will be already updated.
// Updates the `parent` of the facility, which can be outdated since we've migrated the parent's contact.
// Before :
// Facility :
// {
//    _id: ...,
//    type: health_center,
//    name: myfacility,
//    parent: {
//        _id: ...,
//        type: district_hospital,
//        name: myparent,
//        contact: { name: Alice, phone: 123} // old-style contact
//    }
// }
// Parent of the facility :
// {
//     _id: ...,
//     type: district_hospital,
//     name: myparent,
//     contact: { // new-style contact
//         _id: ...,
//         type: person,
//         name: Alice,
//         phone: 123,
//         created_date: 12345678
//         parent: { ... }
//     }
// }
//
// After :
// Facility :
// {
//    _id: ...,
//    type: health_center,
//    name: myfacility,
//    parent: {
//        _id: ...,
//        type: district_hospital,
//        name: myparent,
//        contact: { // new-style contact
//            _id: ...,
//            type: person,
//            name: Alice,
//            phone: 123,
//            created_date: 12345678
//            parent: { ... }
//        }
//    }
// }
// Parent of the facility : unchanged.
const updateParents = function(id, callback) {
  const checkParent = function(facility, callback) {
    if (!facility.parent) {
      return callback({ skip: true });
    }

    // There have been cases of weird {} parents. Remove these, then skip
    if (Object.keys(facility.parent).length === 0) {
      delete facility.parent;
      return db.medic.put(facility, err => {
        if (err) {
          callback(err);
        } else {
          callback({ skip: true });
        }
      });
    }

    if (!facility.parent._id) {
      return callback(
        new Error('facility ' + facility._id + ' has a parent without an _id.')
      );
    }

    if (!facility.parent.contact || !!facility.parent.contact._id) {
      // No contact, or already migrated.
      return callback({ skip: true });
    }

    callback();
  };

  const removeParent = function(facility, callback) {
    const parentId = facility.parent._id;
    delete facility.parent;
    db.medic.put(facility, function(err) {
      if (err) {
        return callback(
          new Error(
            'Failed to delete parent on facility ' +
              facility._id +
              ' - ' +
              JSON.stringify(err, null, 2)
          )
        );
      }
      return callback(null, parentId);
    });
  };

  const resetParent = function(facilityId, parentId, callback) {
    db.medic.get(parentId, function(err) {
      if (err) {
        if (err.status === 404) {
          // Parent does not exist, so cannot be reset
          return callback();
        }
        return callback(err);
      }
      places
        .updatePlace(facilityId, { parent: parentId })
        .then(() => callback())
        .catch(err => {
          callback(
            new Error(
              'Failed to update parent on facility ' +
                facilityId +
                ' - ' +
                JSON.stringify(err, null, 2)
            )
          );
        });
    });
  };

  db.medic.get(id, function(err, facility) {
    if (err) {
      if (err.status === 404) {
        return callback(new Error('facility ' + id + ' not found.'));
      }
      return callback(err);
    }

    async.waterfall(
      [
        async.apply(checkParent, facility),
        async.apply(removeParent, facility),
        async.apply(
          resetParent,
          facility._id /* parentId passed from waterfall */
        ),
      ],
      function(err) {
        if (err && !err.skip) {
          return callback(err);
        }
        return callback();
      }
    );
  });
};

const migrateOneType = function(type, callback) {
  const migrate = function(row, callback) {
    updateParents(row.id, function(err) {
      if (err) {
        return callback(err);
      }
      createPerson(row.id, callback);
    });
  };

  db.medic.query('medic-client/contacts_by_type', { key: [type] }, function(
    err,
    result
  ) {
    if (err) {
      return callback(err);
    }
    async.eachSeries(result.rows, migrate, callback);
  });
};

module.exports = {
  name: 'extract-person-contacts',
  created: new Date(2015, 3, 16, 17, 6, 0, 0),
  run: promisify(function(callback) {
    const types = ['district_hospital', 'health_center', 'clinic'];
    async.eachSeries(types, migrateOneType, callback);
  }),
};
