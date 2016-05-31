var _ = require('underscore'),
    async = require('async');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('Users',
    function($http, PLACE_TYPES, Admins, DbView, Facility) {

      var getType = function(user, admins) {
        if (user.doc.roles && user.doc.roles.length) {
          return user.doc.roles[0];
        }
        return admins[user.doc.name] ? 'admin' : 'unknown';
      };

      var getFacility = function(user, facilities) {
        return _.findWhere(facilities, { _id: user.doc.facility_id });
      };

      var getSettings = function(user, settings) {
        return _.findWhere(settings, { _id: user.id });
      };

      var mapUsers = function(users, settings, facilities, admins) {
        var filtered = _.filter(users, function(user) {
          return user.id.indexOf('org.couchdb.user:') === 0;
        });
        return _.map(filtered, function(user) {
          var setting = getSettings(user, settings) || {};
          return {
            id: user.id,
            rev: user.doc._rev,
            name: user.doc.name,
            fullname: setting.fullname,
            email: setting.email,
            phone: setting.phone,
            facility: getFacility(user, facilities),
            type: getType(user, admins),
            language: { code: setting.language },
            contact_id: setting.contact_id
          };
        });
      };

      var getAllUsers = function(callback) {
        $http
          .get('/_users/_all_docs', { cache: true, params: { include_docs: true } })
          .success(function(data) {
            callback(null, data);
          })
          .error(callback);
      };

      var getAllUserSettings = function(callback) {
        var options = { params: { include_docs: true, key: ['user-settings'] } };
        DbView('doc_by_type', options)
          .then(function(data) {
            callback(null, data.results);
          })
          .catch(callback);
      };

      return function(callback) {
        var Place = _.partial(Facility, { types:PLACE_TYPES });

        async.parallel(
          [ getAllUsers, getAllUserSettings, Place, Admins ],
          function(err, results) {
            if (err) {
              return callback(err);
            }
            callback(null, mapUsers(results[0].rows, results[1], results[2], results[3]));
          }
        );
      };
    }
  );

}());
