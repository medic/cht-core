var ajaxDownload = require('../modules/ajax-download');

angular.module('services').factory('Export',
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
          ajaxDownload.download(url);
        })
        .catch(function(err) {
          $log.error('Error exporting ' + typeName, err);
        });
    };
  }
);
