(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('ConflictResolution',
    ['DB',
    function(DB) {
      return function() {
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
      };
    }]
  );

}());
