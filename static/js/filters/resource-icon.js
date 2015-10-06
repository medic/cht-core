(function () {

  'use strict';

  var module = angular.module('inboxFilters');

  module.filter('resourceIcon', ['$log', 'DB',
    function($log, DB) {

      var doc = null;
      var invoked = false;

      var getResources = function() {
        return DB.get()
          .get('resources', { attachments: true })
          .then(function(_doc) {
            doc = _doc;
          })
          .catch(function(err) {
            $log.error(err);
          });
      };

      var filterFn = function(name) {
        if (!name) {
          return '';
        }
        if (doc) {
          var filename = doc.resources[name];
          var icon = filename && doc._attachments[filename];
          if (icon) {
            return '<img src="data:' + icon.content_type + ';base64,' + icon.data + '"/>';
          }
        }
        if (!invoked) {
          invoked = true;
          getResources();
        }
        return '';
      };

      filterFn.$stateful = true;

      return filterFn;
    }
  ]);

}());
