var _ = require('underscore'),
    asyncSome = require('async/some');

// Hides an element based on an array of expressions, when none of the provided expressions evaluates to Boolean true.
// If any of the expression values is a String or an Array, they will be interpreted as permissions and passed to Auth
// service for evaluation.

angular.module('inboxDirectives').directive('mmAuthGroup', function(Auth) {
  'use strict';
  'ngInject';

  return {
    restrict: 'A',
    scope: { mmAuthGroup: '=' },

    link: function (scope, element) {

      var run = function() {
        element.addClass('hidden');

        scope.mmAuthGroup = _.isArray(scope.mmAuthGroup) ? scope.mmAuthGroup : [scope.mmAuthGroup];

        if (_.any(scope.mmAuthGroup, function(element) {
          return element === true;
        })) {
          return element.removeClass('hidden');
        }

        var permissions = scope.mmAuthGroup
          .filter(function(element) {
            return _.isArray(element) || _.isString(element);
          })
          .map(function(element) {
            return (_.isArray(element) && _.flatten(element)) || element;
          });

        asyncSome(permissions, function (permissionsGroup, callback) {
          Auth(permissionsGroup).then(function () {
            return callback(null, true);
          });
        }, function (err, result) {
          if (result) {
            return element.removeClass('hidden');
          }
        });
      };

      scope.$watch('mmAuthGroup', function() {
        run();
      });
    }
  };
});
