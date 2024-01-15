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
      return ContactTypes.getPersonTypes().then(types => {
        const provided = ContactTypes.getTypeId(contact);
        if (provided) {
          const type = types.find(type => type.id === provided);
          if (type) {
            return provided;
          }
          return $q.reject(new Error(`Unknown type "${provided}"" for person named "${contact.name}"`));
        }
        if (types.find(type => type.id === 'person')) {
          // retained for backwards compatibility
          return 'person';
        }
        return $q.reject(new Error(`Undefined type for person named "${contact.name}"`));
      });
    };

    const savePerson = function(doc) {
      return getPersonType(doc.contact)
        .then(type => {
          const person = {
            name: doc.contact.name,
            phone: doc.contact.phone,
            parent: doc
          };
          if (type === 'person') {
            person.type = type;
          } else {
            person.type = 'contact';
            person.contact_type = type;
          }
          return DB()
            .put(person)
            .then(function(response) {
              doc.contact._id = response._id;
              doc.contact._rev = response._rev;
            });
        });
    };

    const saveRecord = function(contact, create) {
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

    const importContact = function(overwrite, contact) {
      return $http.head(`${Location.url}/${contact._id}`)
        .then(function(response) {
          const rev = CleanETag(response.headers('ETag'));
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
  });
