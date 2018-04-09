var IS_PROD_URL = /^https:\/\/[^.]+.app.medicmobile.org\//,
  BUILDS_DB = 'https://staging.dev.medicmobile.org/_couch/builds';

angular.module('inboxControllers').controller('ConfigurationUpgradeCtrl',
  function(
    $http,
    $log,
    $q,
    $scope,
    DB,
    pouchDB,
    Translate,
    Version,
    Modal
  ) {

    'use strict';
    'ngInject';

    $scope.loading = true;
    $scope.versions = {};

    DB().get('_design/medic')
      .then(function(ddoc) {
        $scope.deployInfo = ddoc.deploy_info;

        if (!$scope.deployInfo) {
          // This user has not deployed via horti, so upgrading via it (for now)
          // won't work / is not supported
          return;
        }

        $scope.allowPrereleaseBuilds = !window.location.href.match(IS_PROD_URL);

        var buildsDb = pouchDB(BUILDS_DB);

        var minVersion = Version.minimumNextRelease($scope.deployInfo.version);

        var viewLookups = [];

        var stripIds = function(releases) {
          releases.forEach(function(release, key, releases) {
            release.id = release.id.replace(/^medic:medic:/, '');
            if (release.id === 'master') {
              releases.splice(0, 0, releases.splice(key, 1)[0]);
            }
          });

          return releases;
        };

        // NB: Once we rely on CouchDB 2.0 combine these three calls
        //     See: http://docs.couchdb.org/en/2.0.0/api/ddoc/views.html#sending-multiple-queries-to-a-view
        viewLookups.push(
          buildsDb
            .query('builds/releases', {
              startkey: [ 'branch', 'medic', 'medic', {}],
              endkey: [ 'branch', 'medic', 'medic'],
              descending: true,
              limit: 50
            })
            .then(function(res) {
              $scope.versions.branches = stripIds(res.rows);
            }));

        viewLookups.push(
          buildsDb
            .query('builds/releases', {
              startkey: [ 'beta', 'medic', 'medic', {}],
              endkey: [ 'beta', 'medic', 'medic', minVersion.major, minVersion.minor, minVersion.patch, minVersion.beta ],
              descending: true,
              limit: 50,
            })
            .then(function(res) {
              $scope.versions.betas = stripIds(res.rows);
            }));

        viewLookups.push(
          buildsDb
            .query('builds/releases', {
              startkey: [ 'release', 'medic', 'medic', {}],
              endkey: [ 'release', 'medic', 'medic', minVersion.major, minVersion.minor, minVersion.patch],
              descending: true,
              limit: 50
            })
            .then(function(res) {
              $scope.versions.releases = stripIds(res.rows);
            }));

        return $q.all(viewLookups);
      })
      .catch(function(err) {
        return Translate('instance.upgrade.error.version_fetch')
          .then(function(msg) {
            $log.error(msg, err);
            $scope.error = msg;
          });
      })
      .then(function() {
        $scope.loading = false;
      });

    $scope.upgrade = function(version) {
      $scope.versionCandidate = version;
      Modal({
        templateUrl: 'templates/modals/configuration_upgrade_confirm.html',
        controller: 'ConfigurationUpgradeConfirmCtrl'
      })
        .catch(function() {})
        .then(function(confirmed) {
          if (confirmed) {
            upgrade();
          }
        });
    };

    var upgrade = function() {
      $scope.error = false;
      $scope.upgrading = $scope.versionCandidate;

      $http
        .post('/api/v1/upgrade', { build: {
          namespace: 'medic',
          application: 'medic',
          version: $scope.versionCandidate
        }})
        .catch(function(err) {
          err = err.responseText || err.statusText;

          return Translate('instance.upgrade.error.deploy')
            .then(function(msg) {
              $log.error(msg, err);
              $scope.error = msg;
              $scope.upgrading = false;
              $scope.versionCandidate = false;
            });
        });
    };
  }
);
