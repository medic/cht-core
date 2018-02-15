(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var TYPES = {
    reports:  { name: 'reports', v2: true },
    contacts: { name: 'contacts', format: 'json', lucene: true },
    messages: { name: 'messages', format: 'xml' },
    audit:    { name: 'audit', format: 'xml' },
    feedback: { name: 'feedback', format: 'xml' },
    logs:     { name: 'logs', format: 'zip' }
  };

  inboxServices.factory('DownloadUrl',
    function(
      $q,
      GenerateLuceneQuery,
      Language
    ) {
      'ngInject';

      var buildV1Url = function(type, language, filters) {
        var name = type.apiName || type.name;
        var params = getParams(type, language, filters);
        return '/api/v1/export/' + name + '?' + $.param(params);
      };

      var buildV2Url = function(type, body) {
        var params = body ? '?' + $.param(body) : '';
        return '/api/v2/export/' + type + params;
      };

      var getParams = function(type, language, filters) {
        var params = {
          format: type.format,
          locale: language
        };
        if (type.lucene) {
          var response = GenerateLuceneQuery(type.name, filters);
          params.query = JSON.stringify(response.query);
          params.schema = JSON.stringify(response.schema);
        }
        return params;
      };

      return function(filters, typeName) {
        var type = TYPES[typeName];
        if (!type) {
          return $q.reject(new Error('Unknown download type'));
        }

        if (type.v2) {
          return $q.resolve(buildV2Url(type.name, filters ? {filters: filters} : null));
        } else {
          return Language().then(function(language) {
            return buildV1Url(type, language, filters);
          });
        }

      };
    }
  );

}());
