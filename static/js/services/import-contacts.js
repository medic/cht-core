var async = require('async'),
    etagRegex = /['"]/g;

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('ImportContacts',
    ['HttpWrapper', 'SaveDoc', 'BaseUrlService',
    function(HttpWrapper, SaveDoc, BaseUrlService) {

      var savePerson = function(doc, callback) {
        if (!doc.contact || doc.contact._id) {
          return callback();
        }
        SaveDoc(null, {
          type: 'person',
          name: doc.contact.name,
          phone: doc.contact.phone,
          parent: doc
        }, function(err, result) {
          if (err) {
            return callback(err);
          }
          doc.contact.type = 'person';
          doc.contact._id = result._id;
          doc.contact._rev = result._rev;
          callback(null, doc);
        });
      };

      var saveRecord = function(contact, create, callback) {
        var id = create ? null : contact._id;
        if (create && contact._rev) {
          // delete _rev since this is a new doc in this database
          delete contact._rev;
        }
        SaveDoc(id, contact, function(err, result) {
          if (err) {
            return callback(err);
          }
          if (!id) {
            id = result._id;
          }
          savePerson(contact, function(err, contact) {
            if (err) {
              return callback(err);
            }
            if (!contact) {
              return callback();
            }
            SaveDoc(id, { contact: contact.contact }, callback);
          });
        });
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
                if (status !== 404) {
                  return callback(new Error(data));
                }
                // for some reason, angular thinks 404 is an error...
                saveRecord(contact, true, callback);
              });
          },
          callback
        );
      };
    }
  ]);

}());
