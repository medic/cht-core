const responsive = require('../modules/responsive');
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
          singleton: true,
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

      $scope.tabs = [{name:'messages',state:'messages.detail',icon:'fa-envelope',translate:'Messages'},
        {name:'tasks',state:'tasks.detail',icon:'fa-flag',translate:'Tasks'},
        {name:'reports',state:'reports.detail',icon:'fa-list-alt',translate:'Reports'},
        {name:'contacts',state:'contacts.detail',icon:'fa-user',translate:'Contacts'},
        {name:'analytics',state:'analytics',icon:'fa-bar-chart-o',translate:'Analytics'}];
        
      $scope.isMobile = responsive.isMobile();
      
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
