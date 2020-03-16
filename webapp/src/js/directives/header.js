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

      const tabs = [{name:'messages',state:'messages.detail',icon:'fa-envelope',translation:'Messages',
        permissions:['can_view_messages','can_view_messages_tab'],typeName:'message'},
      {name:'tasks',state:'tasks.detail',icon:'fa-flag',translation:'Tasks',
        permissions:['can_view_tasks','can_view_tasks_tab']},
      {name:'reports',state:'reports.detail',icon:'fa-list-alt',translation:'Reports',
        permissions:['can_view_reports','can_view_reports_tab'],typeName:'report'},
      {name:'contacts',state:'contacts.detail',icon:'fa-user',translation:'Contacts',
        permissions:['can_view_contacts','can_view_contacts_tab']},
      {name:'analytics',state:'analytics',icon:'fa-bar-chart-o',translation:'Analytics',
        permissions:['can_view_analytics','can_view_analytics_tab']}];

      const hasAuthorization = permission => {
        return Auth(permission)
          .then(() => true)
          .catch(() => false);
      };

      $q.all(tabs.map(tab => hasAuthorization(tab.permissions))).then(results => {
        ctrl.permittedTabs = tabs.filter((tab,index) => results[index]);
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
