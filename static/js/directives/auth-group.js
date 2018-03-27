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

      var process = function() {
        element.addClass('hidden');

        if (!_.isArray(scope.mmAuthGroup)) {
          scope.mmAuthGroup = [scope.mmAuthGroup];
        }

        if (_.any(scope.mmAuthGroup, function(element) {
            return element === true;
          })) {
          return element.removeClass('hidden');
        }

        var permissions = _.map(_.filter(scope.mmAuthGroup, function(element) {
          return typeof element === 'string' || _.isArray(element);
        }), function(element) {
          return (_.isArray(element) && _.flatten(element)) || element;
        });

        if (permissions.length) {
          asyncSome(permissions, function (permissionsGroup, callback) {
            Auth(permissionsGroup).then(function () {
              return callback(null, true);
            });
          }, function (err, result) {
            if (result) {
              return element.removeClass('hidden');
            }
          });
        }
      };

      scope.$watch('mmAuthGroup', function() {
        process();
      });
    }
  };
});
