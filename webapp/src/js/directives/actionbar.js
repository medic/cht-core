angular.module('inboxDirectives').directive('mmActionbar', function() {
  'use strict';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/actionbar.html',
    controller: function($ngRedux, $scope, Selectors) {
      'ngInject';

      var ctrl = this;
      var mapStateToTarget = function(state) {
        return {
          actionBar: Selectors.getActionBar(state),
          currentTab: Selectors.getCurrentTab(state),
          isAdmin: Selectors.getIsAdmin(state),
          loadingContent: Selectors.getLoadingContent(state),
          loadingSubActionBar: Selectors.getLoadingSubActionBar(state),
          selectMode: Selectors.getSelectMode(state),
          selectedContactDoc: Selectors.getSelectedContactDoc(state),
          selectedReportsDocs: Selectors.getSelectedReportsDocs(state),
          showActionBar: Selectors.getShowActionBar(state)
        };
      };
      var unsubscribe = $ngRedux.connect(mapStateToTarget)(ctrl);

      $scope.$on('$destroy', unsubscribe);
    },
    controllerAs: 'actionBarCtrl',
    bindToController: {
      nonContactForms: '<'
    }
  };
});
