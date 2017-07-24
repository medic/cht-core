angular.module('inboxDirectives').directive('reportImage',
  function(DB) {
    'use strict';
    'ngInject';

    return {
      template: '<div class="loader"></div>',
      link: function(scope, element, attr) {
        DB().getAttachment(attr.report, attr.path)
          .then(function(blob) {
            var reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = function() {
              $(element).replaceWith('<img class="report-image" src="data:' + blob.type + ';base64:' + reader.result + '"/>');
            };
          });
      },
    };
});
