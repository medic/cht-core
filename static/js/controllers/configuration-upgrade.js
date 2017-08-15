var IS_PROD_URL = /^https:\/\/[^.]+.app.medicmobile.org\//,
    // BUILDS_DB = 'https://staging.dev.medicmobile.org/_couch/builds';
    BUILDS_DB = 'http://admin:pass@localhost:5988/builds';

angular.module('inboxControllers').controller('ConfigurationUpgradeCtrl',
  function(
    $http,
    $log,
    $q,
    $scope,
    DB,
    pouchDB
  ) {

    'use strict';
    'ngInject';

    $scope.loading = true;
    $scope.versions = {};

    DB().get('_design/medic')
      .then(function(ddoc) {
        $scope.deployInfo = ddoc.deploy_info || {
          version: '1.2.3-beta.4',
          user: 'admin',
          timestamp: new Date()
        };

        $scope.allowPrereleaseBuilds = !window.location.href.match(IS_PROD_URL);

        var buildsDb = pouchDB(BUILDS_DB);

        var minVersion = minimiumNextRelease($scope.deployInfo);

        var viewLookups = [];

        // TODO: Once we rely on CouchDB 2.0 combine these three calls
        viewLookups.push(
          buildsDb
            .query('builds/releases', {
              startkey: [ 'branch', 'medic', 'medic', {}],
              endkey: [ 'branch', 'medic', 'medic'],
              descending: true,
              limit: 50
            })
            .then(function(res) {
              $scope.versions.branches = res.rows;
            }));

        viewLookups.push(
          buildsDb
            .query('builds/releases', {
              startkey: [ 'beta', 'medic', 'medic', minVersion.major, minVersion.minor, minVersion.patch, minVersion.beta ],
              endkey: [ 'beta', 'medic', 'medic', {}]
            })
            .then(function(res) {
              res.rows.forEach(function(row) {
                row.id = stripKey(row.id);
              });

              // TODO can we do this sorting server-side? reverse keys and descending = true?
              $scope.versions.betas = res.rows.reverse();
            }));

        viewLookups.push(
          buildsDb
            .query('builds/releases', {
              startkey: [ 'release', 'medic', 'medic', minVersion.major, minVersion.minor, minVersion.patch],
              endkey: [ 'release', 'medic', 'medic', {}]
            })
            .then(function(res) {
              res.rows.forEach(function(row) {
                row.id = stripKey(row.id);
              });

              // TODO can we do this sorting server-side? reverse keys and descending = true?
              $scope.versions.releases = res.rows.reverse();
            }));

        return $q.all(viewLookups);
      })
      .catch(function(err) {
        $log.error('Error fetching available versions:', err);
        // TODO: have this actually show an error...
        $scope.error = 'Error fetching available versions: ' + err.message;
      })
      .then(function() {
        $scope.loading = false;
      });

    $scope.upgrade = function(version) {
      $scope.error = false;
      $scope.upgrading = version;

      $http.post('/api/v1/upgrade', { build: {
        namespace: 'medic',
        application: 'medic',
        version: JSON.stringify(version)
      }})
        .catch(function(err) {
          err = err.responseText || err.statusText;
          $log.error('Error triggering upgrade:', err);
          $scope.error = 'Error triggering upgrade: ' + err;
          $scope.upgrading = false;
        });
    };

    var stripKey = function(key) {
      return key.replace(/medic:medic:/, '');
    };

    var minimiumNextRelease = function(deployInfo) {
      var minVersion = parseVersion(deployInfo && deployInfo.version);
      if (minVersion) {
        if (minVersion.beta) {
          ++minVersion.beta;
        } else {
          ++minVersion.patch;
        }
      }
      return minVersion;
    };

    var parseVersion = function(versionString) {
      var versionMatch = versionString &&
          versionString.match(/^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-beta\.([0-9]+))?$/);

      return versionMatch && {
        major: parseInt(versionMatch[1]),
        minor: parseInt(versionMatch[2]),
        patch: parseInt(versionMatch[3]),
        beta:  parseInt(versionMatch[4]),
      };
    };
  }
);
