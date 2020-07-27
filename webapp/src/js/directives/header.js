angular.module('inboxDirectives').directive('mmHeader', function() {
  return {
    restrict: 'E',
    templateUrl: 'templates/directives/header.html',
    controller: function(
      $ngRedux,
      $q,
      $scope,
      Auth,
      DBSync,
      GlobalActions,
      HeaderTabs,
      Modal,
      Selectors,
      Settings
    ) {
      'ngInject';

      const ctrl = this;
      const mapStateToTarget = function(state) {
        return {
          currentTab: Selectors.getCurrentTab(state),
          replicationStatus: Selectors.getReplicationStatus(state),
          showPrivacyPolicy: Selectors.getShowPrivacyPolicy(state),
          unreadCount: Selectors.getUnreadCount(state),
        };
      };
      const mapDispatchToTarget = function(dispatch) {
        const globalActions = GlobalActions(dispatch);
        return {
          openGuidedSetup: globalActions.openGuidedSetup,
          openTourSelect: globalActions.openTourSelect,
          setMinimalTabs: globalActions.setMinimalTabs
        };
      };
      const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

      ctrl.logout = () => {
        Modal({
          templateUrl: 'templates/modals/logout_confirm.html',
          controller: 'LogoutConfirmCtrl',
          controllerAs: 'logoutConfirmCtrl',
        }).catch(() => {}); // modal dismissed is ok
      };

      ctrl.openFeedback = () => {
        Modal({
          templateUrl: 'templates/modals/feedback.html',
          controller: 'FeedbackCtrl',
          controllerAs: 'feedbackCtrl'
        }).catch(() => {}); // modal dismissed is ok
      };

      ctrl.replicate = () => {
        DBSync.sync(true);
      };

      Settings().then(settings => {
        const tabs = HeaderTabs(settings);
        return $q.all(tabs.map(tab => Auth.has(tab.permissions))).then(results => {
          ctrl.permittedTabs = tabs.filter((tab,index) => results[index]);
          ctrl.setMinimalTabs(ctrl.permittedTabs.length > 3);
        });
      });

      $scope.$on('$destroy', unsubscribe);
    },
    controllerAs: 'headerCtrl',
    bindToController: {
      adminUrl: '<',
      canLogOut: '<',
      tours: '<'
    }
  };
});
