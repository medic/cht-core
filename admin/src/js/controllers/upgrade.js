const BUILDS_DB = 'https://staging.dev.medicmobile.org/_couch/builds';

angular.module('controllers').controller('UpgradeCtrl',
  function(
    $http,
    $log,
    $q,
    $scope,
    $state,
    $timeout,
    $translate,
    Modal,
    Version,
    pouchDB
  ) {

    'use strict';
    'ngInject';

    $scope.loading = true;
    $scope.versions = {};
    $scope.upgraded = $state.params.upgraded;
    const buildsDb = pouchDB(BUILDS_DB);

    const UPGRADE_URL = '/api/v2/upgrade';
    const POLL_URL = '/setup/poll';
    const UPGRADE_POLL_FREQ = 2000;
    const BUILD_LIST_LIMIT = 50;

    const logError = (error, key) => {
      return $translate
        .onReady()
        .then(() => $translate(key))
        .then((msg) => {
          $log.error(msg, error);
          $scope.error = msg;
        });
    };

    const getExistingDeployment = (expectUpgrade, expectedVersion) => {
      return $http
        .get('/api/deploy-info')
        .then(({ data: deployInfo }) => {
          if (expectUpgrade) {
            if (expectedVersion === deployInfo.version) {
              return reloadPage();
            }
            logError('instance.upgrade.error.deploy', 'instance.upgrade.error.deploy');
          }
          $scope.currentDeploy = deployInfo;
          const currentVersion = Version.currentVersion($scope.currentDeploy);
          $scope.isUsingFeatureRelease = !!currentVersion && typeof currentVersion.featureRelease !== 'undefined';
        })
        .catch(err => logError(err, 'instance.upgrade.error.deploy_info_fetch'));
    };

    const getCurrentUpgrade = () => {
      return $http
        .get(UPGRADE_URL)
        .then(({ data: { upgradeDoc, indexers } }) => {
          if ($scope.upgradeDoc && !upgradeDoc) {
            const expectedVersion = $scope.upgradeDoc.to && $scope.upgradeDoc.to.build;
            getExistingDeployment(true, expectedVersion);
          }

          $scope.upgradeDoc = upgradeDoc;
          $scope.indexerProgress = indexers;

          if (upgradeDoc) {
            $timeout(getCurrentUpgrade, UPGRADE_POLL_FREQ);
          }
          $scope.error = undefined;
        })
        .catch(err => {
          $timeout(getCurrentUpgrade, UPGRADE_POLL_FREQ);
          return logError(err, 'instance.upgrade.error.get_upgrade');
        });
    };

    const getBuilds = (buildsDb, options) => {
      options.descending = true;
      options.limit = BUILD_LIST_LIMIT;

      return buildsDb
        .query('builds/releases', options)
        .then((results) => {
          return results.rows.map(row => {
            if (!row.value.version) {
              row.value.version = row.id.replace(/^medic:medic:/, '');
            }
            return row.value;
          });
        });
    };

    const loadBuilds = () => {
      const minVersion = Version.minimumNextRelease($scope.currentDeploy.version);

      // NB: Once our build server is on CouchDB 2.0 we can combine these three calls
      //     See: http://docs.couchdb.org/en/2.0.0/api/ddoc/views.html#sending-multiple-queries-to-a-view
      return $q
        .all([
          getBuilds(buildsDb, {
            startkey: [ 'branch', 'medic', 'medic', {}],
            endkey: [ 'branch', 'medic', 'medic'],
          }),
          getBuilds(buildsDb, {
            startkey: [ 'beta', 'medic', 'medic', {}],
            endkey: [ 'beta', 'medic', 'medic', minVersion.major, minVersion.minor, minVersion.patch, minVersion.beta ],
          }),
          getBuilds(buildsDb, {
            startkey: [ 'release', 'medic', 'medic', {}],
            endkey: [ 'release', 'medic', 'medic', minVersion.major, minVersion.minor, minVersion.patch],
          }),
          $scope.isUsingFeatureRelease ? getBuilds(buildsDb, {
            startkey: [ minVersion.featureRelease, 'medic', 'medic', {} ],
            endkey: [
              minVersion.featureRelease,
              'medic',
              'medic',
              minVersion.major,
              minVersion.minor,
              minVersion.patch,
              minVersion.beta,
            ],
          }) : [],
        ])
        .then(([ branches, betas, releases, featureReleases ]) => {
          $scope.versions = { branches, betas, releases, featureReleases };
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

      const currentVersion = Version.currentVersion($scope.currentDeploy);
      if (!currentVersion) {
        // Unable to parse the current version information so all releases are
        // potentially incompatible
        return true;
      }

      const releaseVersion = Version.parse(release.base_version || release.version);
      return Version.compare(currentVersion, releaseVersion) > 0;
    };

    const reloadPage = () => {
      $state.go('upgrade', { upgraded: true }, { reload: true });
    };

    $scope.upgrade = (build, action) => {
      const stageOnly = action === 'stage';
      const confirmCallback = () => upgrade(build, action);

      return Modal({
        templateUrl: 'templates/upgrade_confirm.html',
        controller: 'UpgradeConfirmCtrl',
        model: {
          stageOnly,
          before: $scope.currentDeploy.version,
          after: build.version,
          confirmCallback,
          errorKey: 'instance.upgrade.error.deploy'
        },
      }).catch(() => {});
    };

    const waitUntilApiStarts = () => new Promise((resolve) => {
      const pollApi = () => $http
        .get(POLL_URL)
        .then(() => resolve())
        .catch(() => $timeout(pollApi, 1000));
      pollApi();
    });

    const upgrade = (build, action) => {
      $scope.error = false;

      const url = action ? `${UPGRADE_URL}/${action}` : UPGRADE_URL;

      return $http
        .post(url, { build })
        .catch(err => {
          // todo which status do we get with nginx???
          // exclude "50x" like statuses that come from nginx
          if (err && (!err.status || err.status === 503 || err.status === -1) && action === 'complete') {
            // refresh page after API is back up
            return waitUntilApiStarts().then(() => reloadPage());
          }
          return logError(err, 'instance.upgrade.error.deploy');
        })
        .then(() => getCurrentUpgrade());
    };

    $scope.abortUpgrade = () => {
      if (!$scope.upgradeDoc) {
        return;
      }

      const confirmCallback = () => abortUpgrade();

      return Modal({
        templateUrl: 'templates/upgrade_abort.html',
        controller: 'UpgradeConfirmCtrl',
        model: {
          before: $scope.currentDeploy.version,
          after: $scope.upgradeDoc.to && $scope.upgradeDoc.to.version,
          confirmCallback,
          errorKey: 'instance.upgrade.error.abort',
        }
      }).catch(() => {});
    };

    $scope.retryUpgrade = () => {
      if (!$scope.upgradeDoc) {
        return;
      }
      const action = $scope.upgradeDoc.action === 'stage' ? 'stage' : undefined;
      return $scope.upgrade($scope.upgradeDoc.to, action);
    };

    const abortUpgrade = () => {
      return $http
        .delete(UPGRADE_URL)
        .then(() => getCurrentUpgrade())
        .then(() => loadBuilds());
    };
  }
);
