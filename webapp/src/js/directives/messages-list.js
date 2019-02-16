angular.module('inboxDirectives').directive('mmMessagesList', function() {
  'use strict';

    return {
      restrict: 'E',
      templateUrl: 'templates/directives/messages_list.html',
      controller: function($ngRedux, $scope, Selectors) {
        'ngInject';

        var ctrl = this;
        var mapStateToTarget = function(state) {
          return {
            selected: Selectors.getSelected(state)
          };
        };
        var unsubscribe = $ngRedux.connect(mapStateToTarget)(ctrl);

        $scope.$on('$destroy', unsubscribe);
      },
      controllerAs: '$ctrl'
    };
  });
