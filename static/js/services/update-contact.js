var async = require('async');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('UpdateContact', ['DB', 'ClearFacilityCache',
    function(DB, ClearFacilityCache) {

      var updateDoc = function(doc, updates) {
        return DB.get().put(_.extend(doc, updates));
      };

      var updateChildren = function(parent, callback) {
        if (parent.type === 'person') {
          // persons don't have children - we're done
          return callback();
        }

        var options = {
          startkey: [ parent._id ],
          endkey: [ parent._id, {} ],
          include_docs: true
        };
        DB.get()
          .query('medic/facility_by_parent', options)
          .then(function(response) {
            async.each(
              response.rows,
              function(row, callback) {
                if (row.doc.parent._id === parent._id &&
                    row.doc.parent._rev === parent._rev) {
                  // nothing to update
                  return callback();
                }
                updateDoc(row.doc, { parent: parent })
                  .then(function(response) {
                    row.doc._rev = response._rev;
                    updateChildren(row.doc, callback);
                  })
                  .catch(callback);
              },
              callback
            );
          })
          .catch(callback);
      };

      var updateParents = function(contact, callback) {
        // delete the parent to avoid infinite loops
        contact = _.clone(contact);
        delete contact.parent;

        var options = {
          startkey: [ contact._id ],
          endkey: [ contact._id, {} ],
          include_docs: true
        };
        DB.get()
          .query('medic/facilities_by_contact', options)
          .then(function(response) {
            async.each(
              response.rows,
              function(row, callback) {
                if (row.doc.contact._id === contact._id &&
                    row.doc.contact._rev === contact._rev) {
                  // nothing to update
                  return callback();
                }
                updateDoc(row.doc, { contact: contact })
                  .then(function(response) {
                    row.doc._rev = response._rev;
                    callback();
                  })
                  .catch(callback);
              },
              callback
            );
          })
          .catch(callback);
      };

      return function(doc, updates, callback) {
        if (updates.contact) {
          // null out the contact's parent to avoid infinite loops
          delete updates.contact.parent;
        }
        updateDoc(doc, updates)
          .then(function(response) {
            if (!doc) {
              doc = updates;
              doc._id = response._id;
              doc._rev = response._rev;
              return callback(null, doc);
            }
            doc._rev = response._rev;
            var updateFn = doc.type === 'person' ? updateParents : updateChildren;
            updateFn(doc, function(err) {
              ClearFacilityCache();
              callback(err, doc);
            });
          })
          .catch(callback);
      };
    }
  ]);

}());