angular.module('services').factory('ImportContacts',
  function(
    $http,
    $q,
    CleanETag,
    ContactTypes,
    DB,
    Location
  ) {

    'use strict';
    'ngInject';

    const getPersonType = contact => {
      if (contact.type) {
        // user provided type
        return $q.resolve(contact.type);
      }
      return ContactTypes.getPersonTypes().then(types => {
        if (types.find(type => type.id === 'person')) {
          // retained for backwards compatibility
          return 'person';
        }
      });
    };

    var savePerson = function(doc) {
      return getPersonType(doc.contact)
        .then(type => {
          if (!type) {
            return $q.reject(new Error(`Undefined "type" for person named "${doc.contact.name}"`));
          }
          const person = {
            type: type,
            name: doc.contact.name,
            phone: doc.contact.phone,
            parent: doc
          };
          return DB()
            .put(person)
            .then(function(response) {
              doc.contact.type = type;
              doc.contact._id = response._id;
              doc.contact._rev = response._rev;
            });
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

    var importContact = function(overwrite, contact) {
      return $http.head(`${Location.url}/${contact._id}`)
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
      return $q.all(contacts.map(function(contact) {
        return importContact(overwrite, contact);
      }));
    };
  }
);
