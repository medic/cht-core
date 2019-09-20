angular.module('inboxDirectives').component('mmResetFilter', {
  templateUrl: 'templates/directives/filters/reset.html',
  controller: function($ngRedux, $scope, Selectors) {
    'ngInject';

    const ctrl = this;
    const mapStateToTarget = function(state) {
      return {
        selectMode: Selectors.getSelectMode(state)
      };
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget)(ctrl);

    $scope.$on('$destroy', unsubscribe);
  },
  controllerAs: 'resetFilterCtrl',
  bindings: {
    resetFilterModel: '<',
    selected: '<'
  }
});
