angular.module('directives').directive('fileModel', function($parse) {
  'use strict';

  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      const model = $parse(attrs.fileModel);

      element.bind('change', () => {
        scope.$apply(() => {
          model.assign(scope, element[0].files[0]);
        });
      });
    }
  };
});
