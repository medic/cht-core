(function () {

  'use strict';

  var module = angular.module('inboxFilters');

  module.filter('resourceIcon', [
    '$log', 'ResourceIcons',
    function($log, ResourceIcons) {

      var doc;

      ResourceIcons.withIcons
        .then(function(_doc) {
          doc = _doc;
        })
        .catch($log.error);

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

        ResourceIcons.refresh();

        return '<img data-resource-icon="' + name + '"/>';
      };

      return filterFn;
    }
  ]);

}());
