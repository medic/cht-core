var _ = require('underscore');

angular.module('services').factory('ImportContacts',
  function(
    $http,
    $q,
    CleanETag,
    DB,
    Location
  ) {

    'use strict';
    'ngInject';

    var savePerson = function(doc) {
      var person = {
        type: 'person',
        name: doc.contact.name,
        phone: doc.contact.phone,
        parent: doc
      };
      return DB()
        .put(person)
        .then(function(response) {
          doc.contact.type = 'person';
          doc.contact._id = response._id;
          doc.contact._rev = response._rev;
        });
    };

    var saveRecord = function(contact, create) {
      if (create && contact._rev) {
        // delete _rev since this is a new doc in this database
        delete contact._rev;
      }
      return DB()
        .put(contact)
        .then(function(response) {
          contact._id = response._id;
          contact._rev = response._rev;
          if (!contact.contact || contact.contact._id) {
            return $q.resolve();
          }
          return savePerson(contact)
            .then(function() {
              return DB().put(contact);
            })
            .then(function(response) {
              contact._rev = response._rev;
              return $q.resolve();
            });
        });
    };

    var importContact = function(baseUrl, overwrite, contact) {
      return $http.head(baseUrl + contact._id)
        .then(function(response) {
          var rev = CleanETag(response.headers('ETag'));
          if (!rev || !overwrite) {
            // do nothing
            return $q.resolve();
          }
          contact._rev = rev;
          return saveRecord(contact, false);
        })
        .catch(function(response) {
          if (response.status === 404) {
            // for some reason, angular thinks 404 is an error...
            return saveRecord(contact, true);
          }
          return $q.reject(response);
        });
    };

    return function(contacts, overwrite) {
      var baseUrl = Location.path + '/_db/';
      return $q.all(_.map(contacts, function(contact) {
        return importContact(baseUrl, overwrite, contact);
      }));
    };
  }
);
