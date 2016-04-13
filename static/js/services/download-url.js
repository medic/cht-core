(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var types = {
    reports:  { name: 'reports', apiName: 'forms', format: 'xml', lucene: true },
    contacts: { name: 'contacts', format: 'json', lucene: true },
    messages: { name: 'messages', format: 'xml' },
    audit:    { name: 'audit', format: 'xml' },
    feedback: { name: 'feedback', format: 'xml' },
    logs:     { name: 'logs', format: 'zip' }
  };

  inboxServices.factory('DownloadUrl', ['Language', 'GenerateSearchQuery',
    function(Language, GenerateSearchQuery) {

      var buildUrl = function(type, params) {
        var name = type.apiName || type.name;
        return '/api/v1/export/' + name + '?' + $.param(params);
      };

      var getParams = function(type, language, filters, callback) {
        var params = { format: type.format, locale: language };
        if (!type.lucene) {
          return callback(null, params);
        }
        GenerateSearchQuery(type.name, filters, function(err, response) {
          if (err) {
            return callback(err);
          }
          params.query = JSON.stringify(response.query);
          params.schema = JSON.stringify(response.schema);
          return callback(null, params);
        });
      };

      return function(filters, typeName, callback) {
        var type = types[typeName];
        if (!type) {
          return callback(new Error('Unknown download type'));
        }
        Language()
          .then(function(language) {
            getParams(type, language, filters, function(err, params) {
              if (err) {
                return callback(err);
              }
              callback(null, buildUrl(type, params));
            });
          })
          .catch(callback);
      };
    }
  ]);

}()); 
