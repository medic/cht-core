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
          } else if (type === 'reports') {
            GenerateSearchQuery($scope, function(err, query) {
              if (err) {
                return callback(err);
              }
              params.query = query;
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
