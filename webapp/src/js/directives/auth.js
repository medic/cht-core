var _ = require('underscore');

angular.module('inboxDirectives').directive('mmAuth', function($log, Auth, $parse, $q) {
  'use strict';
  'ngInject';
  var link = function(scope, element, attributes) {
    var promises = [];
    if (attributes.mmAuth) {
      promises.push(Auth(attributes.mmAuth.split(',')));
    }

    if (attributes.mmAuthOnline) {
      promises.push(Auth.online($parse(attributes.mmAuthOnline)(scope)));
    }

    if (promises.length) {
      element.addClass('hidden');
      $q
        .all(promises)
        .then(function () {
          element.removeClass('hidden');
        })
        .catch(function (err) {
          if (err) {
            $log.error('Error checking authorization', err);
          }
          element.addClass('hidden');
        });
    }

    var checkAuthAny = function() {
      element.addClass('hidden');

      var mmAuthAny = mmAuthAnyGetter(scope);
      mmAuthAny = _.isArray(mmAuthAny) ? mmAuthAny : [mmAuthAny];

      if (_.any(mmAuthAny, function(element) {
        return element === true;
      })) {
        return element.removeClass('hidden');
      }

      var permissionsGroups = mmAuthAny
        .filter(function(element) {
          return _.isArray(element) || _.isString(element);
        })
        .map(function(element) {
          return (_.isArray(element) && _.flatten(element)) || [ element ];
        });

      if (!permissionsGroups.length) {
        return;
      }

      Auth
        .any(permissionsGroups)
        .then(function() {
          element.removeClass('hidden');
        })
        .catch(function (err) {
          if (err) {
            $log.error('Error checking authorization', err);
          }
          element.addClass('hidden');
        });
    };

    if (attributes.mmAuthAny) {
      var mmAuthAnyGetter = $parse(attributes.mmAuthAny);
      scope.$watch(mmAuthAnyGetter, checkAuthAny);
    }
  };
  return {
    restrict: 'A',
    link: link
  };
});
