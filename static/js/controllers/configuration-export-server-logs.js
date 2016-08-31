angular.module('inboxControllers').controller('ConfigurationExportServerLogsCtrl',
  function (
    $log,
    $scope,
    DownloadUrl
  ) {

    'use strict';
    'ngInject';

    DownloadUrl(null, 'logs')
      .then(function(url) {
        $scope.url = url;
      })
      .catch(function(err) {
        $log.error('Error fetching url', err);
      });

  }
);
