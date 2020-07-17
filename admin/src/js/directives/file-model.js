angular.module('directives').directive('fileModel', function($parse) {
  'use strict';

  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      const model = $parse(attrs.fileModel);
      const modelSetter = model.assign;

      element.bind('change', () => {
        scope.$apply(() => {
          console.log(element[0].files);
          modelSetter(scope, element[0].files[0]);
        });
      });
    }
  };
});
