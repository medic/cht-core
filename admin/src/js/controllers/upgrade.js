const _ = require('lodash/core');

const BUILDS_DB = 'https://staging.dev.medicmobile.org/_couch/builds';

angular.module('controllers').controller('UpgradeCtrl',
  function(
    $http,
    $log,
    $q,
    $scope,
    $translate,
    $window,
    DB,
    Modal,
    Version,
    pouchDB
  ) {

    'use strict';
    'ngInject';

    $scope.loading = true;
    $scope.versions = {};

    const getExistingDeployment = function() {
      return DB().get('_design/medic')
        .then(function(ddoc) {
          $scope.currentDeploy = ddoc.deploy_info;

          const currentVersion = Version.currentVersion($scope.currentDeploy);
          $scope.isUsingFeatureRelease = !!currentVersion && typeof currentVersion.featureRelease !== 'undefined';
        });
    };

    // todo this will change so I'm not refactoring this code yet
    $q.all([getExistingDeployment()])
      .then(function() {
        if (!$scope.currentDeploy) {
          // This user has not deployed via horti, so upgrading via it (for now)
          // won't work / is not supported
          return;
        }

        if ($scope.deployDoc) {
          // This user is currently deploying, don't bother loading builds for
          // them to deploy to
          return;
        }

        const buildsDb = pouchDB(BUILDS_DB);

        const minVersion = Version.minimumNextRelease($scope.currentDeploy.version);

        const builds = function(options) {
          return buildsDb.query('builds/releases', options)
            .then(function(results) {
              results.rows.forEach(function(row) {
                if (!row.value.version) {
                  row.value.version = row.id.replace(/^medic:medic:/, '');
                }
              });

              return _.map(results.rows, 'value');
            });
        };

        // NB: Once our build server is on CouchDB 2.0 we can combine these three calls
        //     See: http://docs.couchdb.org/en/2.0.0/api/ddoc/views.html#sending-multiple-queries-to-a-view
        return $q.all({
          branches: builds({
            startkey: [ 'branch', 'medic', 'medic', {}],
            endkey: [ 'branch', 'medic', 'medic'],
            descending: true,
            limit: 50
          }),
          betas: builds({
            startkey: [ 'beta', 'medic', 'medic', {}],
            endkey: [ 'beta', 'medic', 'medic', minVersion.major, minVersion.minor, minVersion.patch, minVersion.beta ],
            descending: true,
            limit: 50,
          }),
          releases: builds({
            startkey: [ 'release', 'medic', 'medic', {}],
            endkey: [ 'release', 'medic', 'medic', minVersion.major, minVersion.minor, minVersion.patch],
            descending: true,
            limit: 50
          }),
          featureReleases: !$scope.isUsingFeatureRelease ? builds({
            startkey: [minVersion.featureRelease, 'medic', 'medic', {}],
            endkey: [
              minVersion.featureRelease,
              'medic',
              'medic',
              minVersion.major,
              minVersion.minor,
              minVersion.patch,
              minVersion.beta,
            ],
            descending: true,
            limit: 50,
          }) : [],
        }).then(function(results) {
          $scope.versions = results;
        });
      })
      .catch(function(err) {
        return $translate('instance.upgrade.error.version_fetch')
          .then(function(msg) {
            $log.error(msg, err);
            $scope.error = msg;
          });
      })
      .then(function() {
        $scope.loading = false;
      });

    $scope.potentiallyIncompatible = function(release) {
      // Old builds may not have a base version, which means unless their version
      // is in the form 1.2.3[-maybe.4] (ie it's a branch) we can't tell and will
      // just presume maybe it's bad
      if (!release.base_version && !Version.parse(release.version)) {
        return true;
      }

      const currentVersion = Version.currentVersion($scope.currentDeploy);
      if (!currentVersion) {
        // Unable to parse the current version information so all releases are
        // potentially incompatible
        return true;
      }

      const releaseVersion = Version.parse(release.base_version || release.version);
      return Version.compare(currentVersion, releaseVersion) > 0;
    };

    $scope.reloadPage = () => $window.location.reload();

    $scope.upgrade = function(version, action) {
      Modal({
        templateUrl: 'templates/upgrade_confirm.html',
        controller: 'UpgradeConfirmCtrl',
        model: {stageOnly: action === 'stage', before: $scope.currentDeploy.version, after: version }
      })
        .catch(function() {})
        .then(function(confirmed) {
          if (confirmed) {
            upgrade(version, action);

            // todo start polling upgrade progress endpoint
          }
        });
    };

    const upgrade = function(version, action) {
      $scope.error = false;

      const url = action ?
        '/api/v1/upgrade/' + action :
        '/api/v1/upgrade';

      $http
        .post(url, { build: {
          namespace: 'medic',
          application: 'medic',
          version: version
        }})
        .catch(function(err) {
          err = err.responseText || err.statusText;

          return $translate('instance.upgrade.error.deploy')
            .then(function(msg) {
              $log.error(msg, err);
              $scope.error = msg;
              $scope.upgrading = false;
            });
        });
    };
  }
);
