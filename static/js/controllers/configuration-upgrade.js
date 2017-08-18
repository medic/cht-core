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
    pouchDB,
    Version
  ) {

    'use strict';
    'ngInject';

    $scope.loading = true;
    $scope.versions = {};

    DB().get('_design/medic')
      .then(function(ddoc) {
        $scope.deployInfo = ddoc.deploy_info;

        $scope.allowPrereleaseBuilds = !window.location.href.match(IS_PROD_URL);

        var buildsDb = pouchDB(BUILDS_DB);

        var minVersion = Version.minimumNextRelease($scope.deployInfo.version);

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
              res.rows.forEach(function(row) {
                row.id = stripKey(row.id);
              });

              // TODO if you have deployed a branch exclude / grey out the branch you already have deployed
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
        version: version
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
  }
);
