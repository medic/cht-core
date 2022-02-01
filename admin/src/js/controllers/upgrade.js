angular.module('controllers').controller('UpgradeCtrl',
  function(
    $http,
    $interval,
    $log,
    $q,
    $scope,
    $translate,
    $window,
    Modal,
    Version,
    pouchDB
  ) {

    'use strict';
    'ngInject';

    $scope.loading = true;
    $scope.versions = {};

    const UPGRADE_URL = '/api/v1/upgrade';
    const UPGRADE_POLL_FREQ = 2000;
    const BUILD_LIST_LIMIT = 50;
    const BUILDS_DB = 'https://staging.dev.medicmobile.org/_couch/builds';

    const logError = (error, key) => {
      const err = error.responseText || error.statusText;
      return $translate(key).then((msg) => {
        $log.error(msg, err);
        $scope.error = msg;
      });
    };

    const getExistingDeployment = () => {
      return $http
        .get('/api/deploy-info')
        .then(({ data: deployInfo }) => {
          $scope.currentDeploy = deployInfo;
        })
        .catch(err => logError(err, 'instance.upgrade.error.deploy_info_fetch'));
    };

    let followUpgradeInterval;
    const stopFollowingUpgrade = () => followUpgradeInterval && $interval.cancel(followUpgradeInterval);
    const followUpgrade = () => {
      stopFollowingUpgrade();
      followUpgradeInterval = $interval(getCurrentUpgrade, UPGRADE_POLL_FREQ);
    };

    const getCurrentUpgrade = () => {
      return $http
        .get(UPGRADE_URL)
        .then(({ data: { upgradeDoc, indexers } }) => {
          $scope.upgradeDoc = upgradeDoc;
          $scope.indexerProgress = indexers;
        })
        .catch(err => logError(err, 'instance.upgrade.error.get_upgrade'));
    };

    const getBuilds = (buildsDb, options) => {
      options.descending = true;
      options.limit = BUILD_LIST_LIMIT;

      return buildsDb
        .query('builds/releases', options)
        .then((results) => {
          results.rows.forEach((row) => {
            if (!row.value.version) {
              row.value.version = row.id.replace(/^medic:medic:/, '');
            }
          });

          return results.rows.map(row => row.value);
        });
    };

    const loadBuilds = () => {
      const buildsDb = pouchDB(BUILDS_DB);
      const minVersion = Version.minimumNextRelease($scope.currentDeploy.version);

      // NB: Once our build server is on CouchDB 2.0 we can combine these three calls
      //     See: http://docs.couchdb.org/en/2.0.0/api/ddoc/views.html#sending-multiple-queries-to-a-view
      return $q
        .all({
          branches: getBuilds(buildsDb, {
            startkey: [ 'branch', 'medic', 'medic', {}],
            endkey: [ 'branch', 'medic', 'medic'],
          }),
          betas: getBuilds(buildsDb, {
            startkey: [ 'beta', 'medic', 'medic', {}],
            endkey: [ 'beta', 'medic', 'medic', minVersion.major, minVersion.minor, minVersion.patch, minVersion.beta ],
          }),
          releases: getBuilds(buildsDb, {
            startkey: [ 'release', 'medic', 'medic', {}],
            endkey: [ 'release', 'medic', 'medic', minVersion.major, minVersion.minor, minVersion.patch],
          }),
        })
        .then((results) => {
          $scope.versions = results;
        });
    };

    $scope.setupPromise = $q
      .all([
        getExistingDeployment(),
        getCurrentUpgrade(),
      ])
      .then(() => {
        if (!$scope.currentDeploy) {
          // invalid deploy??
          return;
        }

        if ($scope.upgradeDoc) {
          // Upgrade in progress, don't bother loading builds
          followUpgrade();
          return;
        }

        return loadBuilds();
      })
      .catch((err) => logError(err, 'instance.upgrade.error.version_fetch'))
      .then(() => {
        $scope.loading = false;
      });

    $scope.potentiallyIncompatible = (release) => {
      // Old builds may not have a base version, which means unless their version
      // is in the form 1.2.3[-maybe.4] (ie it's a branch) we can't tell and will
      // just presume maybe it's bad
      if (!release.base_version && !Version.parse(release.version)) {
        return true;
      }

      const currentVersion = Version.parse($scope.currentDeploy.base_version);
      if (!currentVersion) {
        // Unable to parse the current version information so all releases are
        // potentially incompatible
        return true;
      }

      const releaseVersion = Version.parse(release.base_version || release.version);
      return Version.compare(currentVersion, releaseVersion) > 0;
    };

    $scope.reloadPage = () => $window.location.reload();

    $scope.upgrade = (version, action) => {
      const stageOnly = action === 'stage';
      const confirmCallback = () => upgrade(version, action);

      Modal({
        templateUrl: 'templates/upgrade_confirm.html',
        controller: 'UpgradeConfirmCtrl',
        model: {
          stageOnly,
          before: $scope.currentDeploy.version,
          after: version,
          confirmCallback,
        },
      }).catch(() => {});
    };

    const upgrade = (version, action) => {
      followUpgrade();
      $scope.error = false;

      const url = action ? `${UPGRADE_URL}/${action}` : UPGRADE_URL;

      return $http
        .post(url, { version })
        .then(() => getCurrentUpgrade())
        .catch((err) => {
          stopFollowingUpgrade();
          return logError(err, 'instance.upgrade.error.deploy');
        });
    };

    $scope.cancelUpgrade = () => {
      if (!$scope.upgradeDoc) {
        return;
      }

      const confirmCallback = () => cancelUpgrade();

      Modal({
        templateUrl: 'templates/upgrade_cancel.html',
        controller: 'UpgradeConfirmCtrl',
        model: {
          before: $scope.currentDeploy.version,
          after: $scope.upgradeDoc.to_version,
          confirmCallback,
        }
      }).catch(() => {});
    };

    const cancelUpgrade = () => {
      return $http
        .delete(UPGRADE_URL)
        .then(() => {
          stopFollowingUpgrade();
          $scope.upgradeDoc = null;
          return loadBuilds();
        })
        .catch((err) => logError(err, 'instance.upgrade.error.cancel'));
    };
  }
);
