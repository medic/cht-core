var async = require('async'),
    etagRegex = /(?:^W\/)|['"]/g;

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('ImportContacts',
    ['HttpWrapper', 'DB', 'BaseUrlService',
    function(HttpWrapper, DB, BaseUrlService) {

      var savePerson = function(doc) {
        var person = {
          type: 'person',
          name: doc.contact.name,
          phone: doc.contact.phone,
          parent: doc
        };
        return DB.get()
          .put(person)
          .then(function(response) {
            doc.contact.type = 'person';
            doc.contact._id = response._id;
            doc.contact._rev = response._rev;
          });
      };

      var saveRecord = function(contact, create, callback) {
        if (create && contact._rev) {
          // delete _rev since this is a new doc in this database
          delete contact._rev;
        }
        DB.get()
          .put(contact)
          .then(function(response) {
            contact._id = response._id;
            contact._rev = response._rev;
            if (!contact.contact || contact.contact._id) {
              return callback();
            }
            return savePerson(contact)
              .then(function() {
                return DB.get()
                  .put(contact)
                  .then(function(response) {
                    contact._rev = response._rev;
                    callback(null, contact);
                  })
                  .catch(callback);
              })
              .catch(callback);
          })
          .catch(callback);
      };

      return function(contacts, overwrite, callback) {
        var baseUrl = BaseUrlService() + '/_db/';
        async.each(
          contacts,
          function(contact, callback) {
            HttpWrapper
              .head(baseUrl + contact._id)
              .success(function(data, status, headers) {
                var rev = headers('ETag').replace(etagRegex, '');
                if (!rev || !overwrite) {
                  // do nothing
                  return callback();
                }
                contact._rev = rev;
                saveRecord(contact, false, callback);
              })
              .error(function(data, status) {
                if (status === 404) {
                  // for some reason, angular thinks 404 is an error...
                  return saveRecord(contact, true, callback);
                }
                callback(new Error(data));
              });
          },
          callback
        );
      };
    }
  ]);

}());
