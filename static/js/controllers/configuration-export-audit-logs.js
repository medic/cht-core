angular.module('inboxControllers').controller('ConfigurationExportAuditLogsCtrl',
  function (
    $log,
    $scope,
    DownloadUrl
  ) {

    'use strict';
    'ngInject';

    DownloadUrl(null, 'audit')
      .then(function(url) {
        $scope.url = url;
      })
      .catch(function(err) {
        $log.error('Error fetching url', err);
      });

  }
);
