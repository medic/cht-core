var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('Users',
    function(
      $http,
      $q,
      Admins,
      DbView,
      Facility,
      PLACE_TYPES
    ) {

      'ngInject';

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

      var getAllUsers = function() {
        return $http.get('/_users/_all_docs', {
          cache: true,
          params: { include_docs: true }
        });
      };

      var getAllUserSettings = function() {
        return DbView(
          'doc_by_type',
          { params: { include_docs: true, key: ['user-settings'] } }
        );
      };

      return function() {
        return $q.all([
          getAllUsers(),
          getAllUserSettings(),
          Facility({ types: PLACE_TYPES }),
          Admins()
        ])
          .then(function(results) {
            return mapUsers(
              results[0].data.rows,
              results[1].results,
              results[2],
              results[3]
            );
          });
      };
    }
  );

}());
