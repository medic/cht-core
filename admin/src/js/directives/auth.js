const _ = require('lodash/core');

angular.module('inboxDirectives').directive('mmAuth', function(
  $log,
  $parse,
  $q,
  Auth
) {
  'use strict';
  'ngInject';
  
  const link = function(scope, element, attributes) {
    const updateVisibility = promises => {
      return $q.all(promises)
        .then(permissions => {
          const allPermissions = permissions.every(permission => !!permission);
          if (allPermissions) {
            element.removeClass('hidden');
            return true;
          }

          $log.debug('mmAuth failed authorization check');
          element.addClass('hidden');
          return false;
        });
    };

    const staticChecks = () => {
      const promises = [];
      if (attributes.mmAuth) {
        promises.push(Auth.has(attributes.mmAuth.split(',')));
      }

      if (attributes.mmAuthOnline) {
        const onlineResult = Auth.online($parse(attributes.mmAuthOnline)(scope));
        promises.push($q.resolve(onlineResult));
      }

      if (!promises.length) {
        return true;
      }

      return updateVisibility(promises);
    };

    const dynamicChecks = allowed => {
      if (allowed && attributes.mmAuthAny) {
        const mmAuthAnyGetter = $parse(attributes.mmAuthAny);
        scope.$watch(mmAuthAnyGetter, () => {
          let mmAuthAny = mmAuthAnyGetter(scope);
          mmAuthAny = Array.isArray(mmAuthAny) ? mmAuthAny : [mmAuthAny];

          if (mmAuthAny.some(element => element === true)) {
            element.removeClass('hidden');
            return;
          }

          const permissionsGroups = mmAuthAny
            .filter(element => Array.isArray(element) || _.isString(element))
            .map(element => (Array.isArray(element) && _.flattenDeep(element)) || [ element ]);

          if (!permissionsGroups.length) {
            element.addClass('hidden');
            return;
          }

          return updateVisibility([ Auth.any(permissionsGroups) ]);
        });
      }
    };

    element.addClass('hidden');
    const result = staticChecks();
    if (result === true) {
      dynamicChecks(true);
    } else {
      result.then(dynamicChecks);
    }
  };
  
  return {
    restrict: 'A',
    link,
  };
});
