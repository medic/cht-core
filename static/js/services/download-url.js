(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var buildUrl = function(type, params) {
    return '/api/v1/export/' + type + '?' + $.param(params);
  };

  inboxServices.factory('DownloadUrl', ['GenerateSearchQuery', 'Language',
    function(GenerateSearchQuery, Language) {
      return function($scope, type, callback) {
        Language(function(err, language) {
          if (err) {
            return console.log('Error loading language', err);
          }
          var params = { format: 'xml', locale: language };
          if (type === 'messages' || type === 'audit' || type === 'feedback') {
            return callback(null, buildUrl(type, params));
          } else if (type === 'reports' || type === 'contacts') {
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
            return callback('Unknown download type');
          }
        });
      };
    }
  ]);

}()); 
