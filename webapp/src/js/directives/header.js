angular.module('inboxDirectives').directive('mmHeader', function() {
  return {
    restrict: 'E',
    templateUrl: 'templates/directives/header.html',
    controller: function(
      $ngRedux,
      $scope,
      DBSync,
      GlobalActions,
      Modal,
      Selectors
    ) {
      'ngInject';

      const ctrl = this;
      const mapStateToTarget = function(state) {
        return {
          currentTab: Selectors.getCurrentTab(state),
          replicationStatus: Selectors.getReplicationStatus(state),
          unreadCount: Selectors.getUnreadCount(state)
        };
      };
      const mapDispatchToTarget = function(dispatch) {
        const globalActions = GlobalActions(dispatch);
        return {
          openGuidedSetup: globalActions.openGuidedSetup,
          openTourSelect: globalActions.openTourSelect
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
