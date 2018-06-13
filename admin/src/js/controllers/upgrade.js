var _ = require('underscore');

var IS_PROD_URL = /^https:\/\/[^.]+.app.medicmobile.org\//,
    BUILDS_DB = 'https://staging.dev.medicmobile.org/_couch/builds',
    DEPLOY_DOC_ID = 'horti-upgrade';

angular.module('controllers').controller('UpgradeCtrl',
  function(
    $http,
    $log,
    $q,
    $scope,
    $timeout,
    $window,
    Changes,
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

    var getCurrentDeployment = function() {
      return DB().get(DEPLOY_DOC_ID)
      .then(function(deployDoc) {
        $scope.deployDoc = deployDoc;
      }).catch(function(err) {
        if (err.status !== 404) {
          throw err;
        }
      });
    };

    var getExistingDeployment = function() {
      return DB().get('_design/medic')
        .then(function(ddoc) {
          $scope.currentDeploy = ddoc.deploy_info;
        });
    };

    $q.all([getCurrentDeployment(), getExistingDeployment()])
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

        $scope.allowPrereleaseBuilds = !window.location.href.match(IS_PROD_URL);

        var buildsDb = pouchDB(BUILDS_DB);

        var minVersion = Version.minimumNextRelease($scope.currentDeploy.version);

        var builds = function(options) {
          return buildsDb.query('builds/releases', options)
            .then(function(results) {
              results.rows.forEach(function(row) {
                if (!row.value.version) {
                  row.value.version = row.id.replace(/^medic:medic:/, '');
                }
              });

              return _.pluck(results.rows, 'value');
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
          })
        }).then(function(results) {
          $scope.versions = results;
        });
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

    $scope.potentiallyIncompatible = function(release) {
      // Old builds may not have a base version, which means unless their version
      // is in the form 1.2.3[-maybe.4] (ie it's a branch) we can't tell and will
      // just presume maybe it's bad
      if (!release.base_version && !Version.parse(release.version)) {
        return true;
      }

      var currentVersion = Version.parse($scope.currentDeploy.base_version);
      var releaseVersion = Version.parse(release.base_version || release.version);

      return Version.compare(currentVersion, releaseVersion) > 0;
    };

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
          }
        });
    };

    var upgrade = function(version, action) {
      $scope.error = false;

      var url = action ?
        '/api/v1/upgrade/' + action :
        '/api/v1/upgrade';

      // This will cause the DEPLOY_DOC_ID doc to be written by api, which
      // will be caught in the changes feed below
      $http
        .post(url, { build: {
          namespace: 'medic',
          application: 'medic',
          version: version
        }})
        .catch(function(err) {
          err = err.responseText || err.statusText;

          return Translate('instance.upgrade.error.deploy')
            .then(function(msg) {
              $log.error(msg, err);
              $scope.error = msg;
              $scope.upgrading = false;
            });
        });
    };

    Changes({
      key: 'upgrade',
      filter: function(change) {
        return change.id === DEPLOY_DOC_ID;
      },
      callback: function(change) {
        $timeout(function() { $scope.deployDoc = change.doc; });
      }
    });
  }
);
