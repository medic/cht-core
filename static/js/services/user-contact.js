angular.module('inboxServices').factory('UserContact',
  function(
    DB,
    UserSettings
  ) {
    'use strict';
    'ngInject';
    return function() {
      return UserSettings().then(function(user) {
        if (!user.contact_id) {
          return;
        }
        return DB().get(user.contact_id).catch(function(err) {
          if (err.status === 404) {
            return;
          }
          throw err;
        });
      });
    };
  }
);
