angular.module('inboxDirectives').directive('mmHeader', function() {
  return {
    restrict: 'E',
    templateUrl: 'templates/directives/header.html',
    controller: function($ngRedux, $scope, Selectors) {
      'ngInject';

      const ctrl = this;
      const mapStateToTarget = function(state) {
        return {
          currentTab: Selectors.getCurrentTab(state),
          unreadCount: Selectors.getUnreadCount(state)
        };
      };
      const unsubscribe = $ngRedux.connect(mapStateToTarget)(ctrl);

      $scope.$on('$destroy', unsubscribe);
    },
    controllerAs: 'headerCtrl',
    bindToController: {
      adminUrl: '<'
    }
  };
});
