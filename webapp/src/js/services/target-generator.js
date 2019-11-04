
(function () {

  'use strict';

  angular.module('inboxServices').factory('TargetGenerator',
    function(
    ) {

      'ngInect';

      return function(callback) {
        callback(null, []);
      };
    }
  );

}());
