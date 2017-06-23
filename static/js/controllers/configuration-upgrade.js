var PouchDB = require('pouchdb');

angular.module('inboxControllers').controller('ConfigurationUpgradeCtrl',
  function(
    $log,
    $scope,
    DB
  ) {

    'use strict';
    'ngInject';

    $scope.loading = true;
    $scope.versions = {};

    DB().get('_design/medic')
      .then(function(ddoc) {
        $scope.deployInfo = ddoc.deploy_info;
        var currentVersion = parseVersion($scope.deployInfo && $scope.deployInfo.version);

        $scope.allowBranches = !window.location.href.match(/^https:\/\/[^.]+.app.medicmobile.org\//);

//        return new PouchDB('https://staging.dev.medicmobile.org/_couch/builds')
        return new PouchDB('http://admin:pass@localhost:5984/builds')
          .allDocs()
          .then(function(res) {
            $scope.versions.tags = [];
            $scope.versions.branches = [];

            res.rows.forEach(function(row) {
              var id = row.id;
              var version = parseVersion(id);

              if (version) {
                if (!currentVersion ||
                    (version.major  >  currentVersion.major ||
                    (version.major === currentVersion.major && 
                      (version.minor  >  currentVersion.minor ||
                      (version.minor === currentVersion &&
                        (version.patch  >  currentVersion.patch)))))) {
                  $scope.versions.tags.push(id);
                }
              } else {
                $scope.versions.branches.push(id);
              }
            });
          });
      })
      .catch(function(err) {
        $log.error('Error fetching available versions:' + err);
        $scope.error = 'Error fetching available versions: ' + err.message;
      })
      .then(function() {
        $scope.loading = false;
      });

    $scope.upgrade = function(version) {
      $scope.upgrading = true;

      window.jQuery.ajax({
        method: 'POST',
        url: '/api/upgrade',
        data: JSON.stringify({ version:version }),
        contentType: 'application/json',
      })
        .fail(function(err) {
          err = err.responseText || err.statusText;
          $log.error('Error triggering upgrade:', err);
          $scope.error = 'Error triggering upgrade: ' + err;
          $scope.upgrading = false;
          $scope.$apply();
        });
    };


    function parseVersion(versionString) {
      var versionMatch = versionString && versionString.match(/^[0-9]+\.[0-9]+\.[0-9]+$/);

      return versionMatch && {
        major: versionMatch[1],
        minor: versionMatch[2],
        patch: versionMatch[3],
      };
    }
  }
);
