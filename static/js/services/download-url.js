(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var TYPES = {
    reports:  { name: 'reports', apiName: 'forms', format: 'xml', lucene: true },
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

      var buildUrl = function(type, language, filters) {
        var name = type.apiName || type.name;
        var params = getParams(type, language, filters);
        return '/api/v1/export/' + name + '?' + $.param(params);
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
        return Language().then(function(language) {
          return buildUrl(type, language, filters);
        });
      };
    }
  );

}());
