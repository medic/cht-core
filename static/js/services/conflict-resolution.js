(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('ConflictResolution',
    ['E2ETESTING', 'DB',
    function(E2ETESTING, DB) {
      return function() {
        if (!E2ETESTING) {
          DB.get()
            .changes({
              live: true,
              since: 'now',
              include_docs: true,
              conflicts: true
            })
            .on('change', function(res) {
              if (!res.doc._conflicts) {
                return;
              }
              console.log('conflict', res.doc);
            });
        }
      };
    }]
  );

}());
