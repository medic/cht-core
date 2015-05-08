(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var updateParent = function(db, doc, callback) {
    if (doc.type === 'person' && doc.parent && doc.parent._id) {
      db.getDoc(doc.parent._id, function(err, parent)  {
        if (err) {
          return callback(err);
        }
        if (parent.contact.phone !== doc.phone) {
          return callback();
        }
        parent.contact = null;
        db.saveDoc(parent, callback);
      });
    } else {
      callback();
    }
  };

  inboxServices.factory('DeleteDoc', ['$rootScope', 'db',
    function($rootScope, db) {
      return function(docId, callback) {
        db.getDoc(docId, function(err, doc) {
          if (err) {
            return callback(err);
          }
          updateParent(db, doc, function(err) {
            if (err) {
              return callback(err);
            }
            doc._deleted = true;
            db.saveDoc(doc, function(err) {
              if (err) {
                return callback(err);
              }
              if (doc.type === 'clinic' ||
                  doc.type === 'health_center' ||
                  doc.type === 'district_hospital' ||
                  doc.type === 'person') {
                $rootScope.$broadcast('ContactUpdated', doc);
              }
              callback(null, doc);
            });
          });
        });
      };
    }
  ]);

}());