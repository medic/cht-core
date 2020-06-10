angular.module('inboxDirectives').component('mmTrainingsList', {
  templateUrl: 'templates/directives/trainings_list.html',
  controller: function($ngRedux, $scope, Selectors) {
    'ngInject';

    const ctrl = this;
    const mapStateToTarget = function(state) {
      return {
        selectMode: Selectors.getSelectMode(state),
        selectedTrainings: Selectors.getSelectedTrainings(state)
      };
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget)(ctrl);

    $scope.$on('$destroy', unsubscribe);
  },
  controllerAs: 'trainingsListCtrl',
  bindings: {
    appending: '<',
    error: '<',
    filtered: '<',
    hasTrainings: '<',
    loading: '<',
    moreItems: '<'
  }
});
