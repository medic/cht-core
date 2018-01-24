angular.module('inboxServices').factory('OnlineStatus',
  function(
    DB
  ) {
    'use strict';
    'ngInject';

    return function() {
      return DB({remote: true}).allDocs({keys: ['_design/medic']})
        .then(function() {
          return true;
        })
        .catch(function() {
          return false;
        });
    };
  }
);
