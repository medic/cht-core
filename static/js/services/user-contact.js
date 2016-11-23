angular.module('inboxServices').factory('UserContact',
  function(
    DB,
    UserSettings
  ) {
    'use strict';
    'ngInject';
    return function() {
      return UserSettings().then(function(user) {
        return user.contact_id && DB().get(user.contact_id);
      });
    };
  }
);
