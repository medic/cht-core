var ajaxDownload = require('../modules/ajax-download');

angular.module('inboxServices').factory('Export',
  function(
    $http,
    $log,
    DownloadUrl
  ) {
    'ngInject';
    'use strict';
    return function(filters, typeName) {
      return DownloadUrl(filters, typeName)
        .then(function(url) {
          return $http.post(url);
        })
        .then(function(res) {
          ajaxDownload.download(res);
        })
        .catch(function(err) {
          $log.error('Error exporting ' + typeName, err);
        });
    };
  }
);
