var TYPES = {
  reports:  { name: 'reports', v2: true },
  contacts: { name: 'contacts', v2: true },
  messages: { name: 'messages', v2: true },
  audit:    { name: 'audit', format: 'xml' },
  feedback: { name: 'feedback', format: 'xml' },
  logs:     { name: 'logs', format: 'zip' }
};

angular.module('services').factory('DownloadUrl',
  function(
    $q
  ) {
    'ngInject';
    'use strict';

    var buildV1Url = function(type) {
      var name = type.apiName || type.name;
      var params = { format: type.format };
      return '/api/v1/export/' + name + '?' + $.param(params);
    };

    var buildV2Url = function(type, filters) {
      var params = filters ? '?' + $.param({ filters: filters }) : '';
      return '/api/v2/export/' + type + params;
    };

    return function(filters, typeName) {
      var type = TYPES[typeName];
      if (!type) {
        return $q.reject(new Error('Unknown download type'));
      }

      if (type.v2) {
        return $q.resolve(buildV2Url(type.name, filters));
      } else {
        return buildV1Url(type);
      }

    };
  }
);
