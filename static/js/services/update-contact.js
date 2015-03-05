var async = require('async');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('UpdateContact', ['SaveDoc', 'DbView',
    function(SaveDoc, DbView) {

      var updateChildren = function(parent, callback) {
        if (parent.type !== 'health_center' && parent.type !== 'district_hospital') {
          // clinics don't have children - we're done
          return callback();
        }

        var options = {
          startkey: [ parent._id ],
          endkey: [ parent._id, {} ],
          include_docs: true
        };
        DbView('facility_by_parent', options, function(err, children) {
          if (err) {
            return callback(err);
          }
          async.each(
            children,
            function(child, callback) {
              if (child.parent._id === parent._id && child.parent._rev === parent._rev) {
                // nothing to update
                return callback();
              }
              SaveDoc(child._id, { parent: parent }, function(err, updated) {
                if (err) {
                  return callback(err);
                }
                updateChildren(updated, callback);
              });
            },
            callback
          );
        });
      };

      return function(id, updates, callback) {
        if (!callback) {
          callback = updates;
          updates = id;
          id = null;
        }
        SaveDoc(id, updates, function(err, doc) {
          if (err) {
            return callback(err);
          }
          updateChildren(doc, function(err) {
            callback(err, doc);
          });
        });
      };
    }
  ]);

}());