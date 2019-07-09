angular.module('inboxDirectives').directive('mmContactsFilters', function() {
  'use strict';
  'ngInject';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/contacts_filters.html',
    controller: function($ngRedux, $scope, Selectors) {
      'ngInject';

      const ctrl = this;
      const mapStateToTarget = function(state) {
        return {
          selectedContact: Selectors.getSelectedContact(state)
        };
      };
      const unsubscribe = $ngRedux.connect(mapStateToTarget)(ctrl);

      $scope.$on('$destroy', unsubscribe);
    },
    controllerAs: 'contactsFiltersCtrl'
  };
});
