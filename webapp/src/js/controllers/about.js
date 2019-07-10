angular.module('inboxControllers').controller('AboutCtrl',
  function (
    $interval,
    $log,
    $ngRedux,
    $scope,
    $translate,
    $window,
    DB,
    Debug,
    GlobalActions,
    ResourceIcons,
    Selectors,
    Session
  ) {
    'use strict';
    'ngInject';

    const ctrl = this;
    const mapStateToTarget = function(state) {
      return {
        version: Selectors.getVersion(state)
      };
    };
    const mapDispatchToTarget = function(dispatch) {
      var globalActions = GlobalActions(dispatch);
      return {
        setVersion: globalActions.setVersion
      };
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    $scope.url = $window.location.hostname;
    $scope.userCtx = Session.userCtx();

    $scope.debugOptionEnabled = $scope.url.indexOf('localhost') >= 0;

    ResourceIcons.getDocResources('partners').then(partners => {
      $scope.partners = partners;
    });

    const formatRev = rev => rev.split('-')[0];

    const getDeployVersion = function(deployInfo) {
      const version = deployInfo && deployInfo.version;
      if (!version) {
        return false;
      }
      if (version === deployInfo.base_version || !deployInfo.base_version) {
        return version;
      }
      return `${version} (~${deployInfo.base_version})`;
    };

    const updateAndroidDataUsage = () => {
      $scope.androidDataUsage = JSON.parse($window.medicmobile_android.getDataUsage());
    };

    // get local ddoc version
    DB().get('_design/medic-client')
      .then(function(info) {
        const version = getDeployVersion(info.deploy_info);
        if (version) {
          ctrl.setVersion(version);
        }
        $scope.clientDdocVersion = formatRev(info._rev);
      })
      .catch(function(err) {
        $log.error('Could not access local _design/medic-client', err);
      });

    // get remote ddoc version
    DB({ remote: true }).allDocs({ key: '_design/medic-client' })
      .then(function(info) {
        $scope.ddocVersion = formatRev(info.rows[0].value.rev);
      })
      .catch(function(err) {
        $translate('app.version.unknown').then(text => $scope.ddocVersion = text);
        $log.debug('Could not access remote _design/medic', err);
      });

    $scope.reload = function() {
      $window.location.reload(false);
    };
    $scope.enableDebugModel = {
      val: Debug.get()
    };
    $scope.$watch('enableDebugModel.val', Debug.set);

    if ($window.medicmobile_android && typeof $window.medicmobile_android.getDataUsage === 'function') {
      updateAndroidDataUsage();
      const dataUsageUpdate = $interval(updateAndroidDataUsage, 2000);
      $scope.$on('$destroy', function() {
        $interval.cancel(dataUsageUpdate);
      });
    }

    DB().info()
      .then(function(result) {
        $scope.dbInfo = result;
      })
      .catch(function (err) {
        $log.error('Failed to fetch DB info', err);
      });

    $scope.$on('$destroy', unsubscribe);
  }
);
