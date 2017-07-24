angular.module('inboxDirectives').directive('reportImage',
  function($window, DB) {
    'use strict';
    'ngInject';

    return {
      template: '<div class="loader"></div>',
      link: function(scope, element, attr) {
        var objectUrl;

        DB().getAttachment(attr.report, attr.path)
          .then(function(blob) {
            var $newImg = $('<img class="report-image"/>');
            objectUrl = ($window.URL || $window.webkitURL).createObjectURL(blob);
            $newImg.attr('src', objectUrl);
            $(element).replaceWith($newImg);
          });

        scope.$on('$destroy', function() {
          if (objectUrl) {
            ($window.URL || $window.webkitURL).revokeObjectURL(objectUrl);
          }
        });

      },
    };
});
