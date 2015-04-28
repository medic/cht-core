(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var luceneTypes = ['reports', 'contacts'];
  var simpleTypes = ['messages', 'audit', 'feedback', 'logs'];

  var buildUrl = function(type, params) {
    return '/api/v1/export/' + type + '?' + $.param(params);
  };

  inboxServices.factory('DownloadUrl', ['GenerateSearchQuery', 'Language',
    function(GenerateSearchQuery, Language) {
      return function($scope, type, callback) {
        Language(function(err, language) {
          if (err) {
            return callback(err);
          }
          var params = { format: 'xml', locale: language };
          if (simpleTypes.indexOf(type) !== -1) {
            return callback(null, buildUrl(type, params));
          } else if (luceneTypes.indexOf(type) !== -1) {
            if (type === 'reports') {
              type = 'forms';
            }
            if (type === 'contacts') {
              params.format = 'json';
            }
            GenerateSearchQuery($scope, function(err, response) {
              if (err) {
                return callback(err);
              }
              params.query = JSON.stringify(response.query);
              params.schema = JSON.stringify(response.schema);
              return callback(null, buildUrl(type, params));
            });
          } else {
            return callback(new Error('Unknown download type'));
          }
        });
      };
    }
  ]);

}()); 
