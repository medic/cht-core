angular.module('inboxControllers').controller('AboutCtrl',
  function (
    $interval,
    $log,
    $ngRedux,
    $scope,
    $state,
    $timeout,
    $translate,
    $window,
    DB,
    Feedback,
    ResourceIcons,
    Selectors,
    Session,
    Version
  ) {
    'use strict';
    'ngInject';

    const ctrl = this;
    const mapStateToTarget = state => ({
      androidAppVersion: Selectors.getAndroidAppVersion(state),
      replicationStatus: Selectors.getReplicationStatus(state)
    });

    const unsubscribe = $ngRedux.connect(mapStateToTarget)(ctrl);

    ctrl.userCtx = Session.userCtx();

    ResourceIcons.getDocResources('partners').then(partners => {
      ctrl.partners = partners;
    });

    const updateAndroidDataUsage = () => {
      ctrl.androidDataUsage = JSON.parse($window.medicmobile_android.getDataUsage());
    };

    Version.getLocal()
      .then(({ version, rev }) => {
        ctrl.version = version;
        ctrl.localRev = rev;
      })
      .catch(function(err) {
        $log.error('Could not access local version', err);
      });

    Version.getRemoteRev()
      .catch(function(err) {
        $log.debug('Could not access remote ddoc rev', err);
        return $translate('app.version.unknown');
      })
      .then(rev => ctrl.remoteRev = rev);

    ctrl.knockCount = 0;
    ctrl.secretDoor = () => {
      if (ctrl.doorTimeout) {
        $timeout.cancel(ctrl.doorTimeout);
      }
      if (ctrl.knockCount++ >= 5) {
        $state.go('testing');
      } else {
        ctrl.doorTimeout = $timeout(() => {
          ctrl.knockCount = 0;
        }, 1000);
      }
    };
    ctrl.reload = function() {
      $window.location.reload(false);
    };

    if ($window.medicmobile_android && typeof $window.medicmobile_android.getDataUsage === 'function') {
      updateAndroidDataUsage();
      const dataUsageUpdate = $interval(updateAndroidDataUsage, 2000);
      $scope.$on('$destroy', function() {
        $interval.cancel(dataUsageUpdate);
      });
    }

    DB().info()
      .then(function(result) {
        ctrl.dbInfo = result;
      })
      .catch(function (err) {
        $log.error('Failed to fetch DB info', err);
      });

    $scope.$on('$destroy', unsubscribe);
  }
);
