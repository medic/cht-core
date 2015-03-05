(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var buildUrl = function(type, params) {
    return '/api/v1/export/' + type + '?' + $.param(params);
  };

  inboxServices.factory('DownloadUrl', ['GenerateSearchQuery', 'Language', 'BaseUrlService',
    function(GenerateSearchQuery, Language, BaseUrlService) {
      return function($scope, type, callback) {
        if (type === 'contacts') {
          return callback(null, BaseUrlService() + '/facilities/backup');
        }
        Language(function(err, language) {
          if (err) {
            return console.log('Error loading language', err);
          }
          var params = { format: 'xml', locale: language };
          if (type === 'messages' || type === 'audit' || type === 'feedback') {
            return callback(null, buildUrl(type, params));
          } else if (type === 'reports') {
            GenerateSearchQuery($scope, function(err, response) {
              if (err) {
                return callback(err);
              }
              params.query = JSON.stringify(response.query);
              params.schema = JSON.stringify(response.schema);
              return callback(null, buildUrl('forms', params));
            });
          } else {
            return callback('Unknown download type');
          }
        });
      };
    }
  ]);

}()); 
