var PouchDB = require('pouchdb-browser');

angular.module('inboxControllers').controller('ConfigurationUpgradeCtrl',
  function(
    $log,
    $q,
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

        $scope.allowBetas = $scope.allowBranches =
            !window.location.href.match(/^https:\/\/[^.]+.app.medicmobile.org\//);

        var stagingDb = new PouchDB('https://staging.dev.medicmobile.org/_couch/builds');


        var viewLookups = [];


        viewLookups.push(
            stagingDb
              .query('builds/branches')
              .then(function(res) {
                $scope.versions.branches = res.rows.sort(function(a, b) {
                  return Date.parse(b.value.build_time) -
                         Date.parse(a.value.build_time);
                });
              }));


        var versionRestriction;
        var minVersion = parseVersion($scope.deployInfo && $scope.deployInfo.version);
        if (minVersion) {
          if (minVersion.beta) {
            ++minVersion.beta;
          } else {
            ++minVersion.patch;
          }

          versionRestriction = { startkey: [ minVersion.major, minVersion.minor, minVersion.patch ] };
        }


        viewLookups.push(
            stagingDb
              .query('builds/betas', versionRestriction)
              .then(function(res) {
                $scope.versions.betas = res.rows.reverse();
              }));


        viewLookups.push(
            stagingDb
              .query('builds/releases', versionRestriction)
              .then(function(res) {
                $scope.versions.releases = res.rows.reverse();
              }));

          return $q.all(viewLookups);
      })
      .catch(function(err) {
        $log.error('Error fetching available versions:' + err);
        $scope.error = 'Error fetching available versions: ' + err.message;
      })
      .then(function() {
        $scope.loading = false;
      });

    $scope.upgrade = function(version) {
      $scope.error = false;
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
      var versionMatch = versionString &&
          versionString.match(/^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-beta\.([0-9]+))?$/);

      return versionMatch && {
        major: parseInt(versionMatch[1]),
        minor: parseInt(versionMatch[2]),
        patch: parseInt(versionMatch[3]),
        beta:  parseInt(versionMatch[4]),
      };
    }
  }
);
