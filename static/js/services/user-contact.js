angular.module('inboxServices').factory('UserContact',
  function(
    LineageModelGenerator,
    UserSettings
  ) {
    'use strict';
    'ngInject';
    return function() {
      return UserSettings()
        .then(function(user) {
          if (!user.contact_id) {
            return;
          }
          return LineageModelGenerator.contact(user.contact_id, { merge: true });
        })
        .catch(function(err) {
          if (err.code === 404) {
            return;
          }
          throw err;
        });
    };
  }
);
