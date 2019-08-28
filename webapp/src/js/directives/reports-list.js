angular.module('inboxDirectives').component('mmReportsList', {
  templateUrl: 'templates/directives/reports_list.html',
  controller: function($ngRedux, $scope, Selectors) {
    'ngInject';

    const ctrl = this;
    const mapStateToTarget = function(state) {
      return {
        selectMode: Selectors.getSelectMode(state),
        selectedReports: Selectors.getSelectedReports(state)
      };
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget)(ctrl);

    $scope.$on('$destroy', unsubscribe);
  },
  controllerAs: 'reportsListCtrl',
  bindings: {
    appending: '<',
    error: '<',
    filtered: '<',
    hasReports: '<',
    loading: '<',
    moreItems: '<'
  }
});
