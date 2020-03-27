angular.module('inboxDirectives').directive('mmFacilityFilter', function(SearchFilters) {
  'use strict';
  'ngInject';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/filters/facility.html',
    controller: function(
      $log,
      $ngRedux,
      $scope,
      $timeout,
      GlobalActions,
      PlaceHierarchy,
      Selectors
    ) {
      'ngInject';

      const ctrl = this;
      const mapStateToTarget = function(state) {
        return {
          isAdmin: Selectors.getIsAdmin(state),
          selectMode: Selectors.getSelectMode(state)
        };
      };
      const mapDispatchToTarget = function(dispatch) {
        const globalActions = GlobalActions(dispatch);
        return {
          setFilter: globalActions.setFilter
        };
      };
      const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

      // Render the facilities hierarchy as the user is scrolling through the list
      // Initially, don't load/render any
      ctrl.totalFacilitiesDisplayed = 0;
      ctrl.facilities = [];

      // Load the facilities hierarchy and render one district hospital
      // when the user clicks on the filter dropdown
      ctrl.monitorFacilityDropdown = () => {
        PlaceHierarchy()
          .then(hierarchy => {
            ctrl.facilities = hierarchy;
            ctrl.totalFacilitiesDisplayed += 1;
          })
          .catch(err => $log.error('Error loading facilities', err));

        $('#facilityDropdown span.dropdown-menu > ul').scroll((event) => {
          // visible height + pixel scrolled >= total height - 100
          if (event.target.offsetHeight + event.target.scrollTop >= event.target.scrollHeight - 100) {
            $timeout(() => ctrl.totalFacilitiesDisplayed += 1);
          }
        });
      };

      $scope.$on('$destroy', unsubscribe);
    },
    controllerAs: 'facilityFilterCtrl',
    bindToController: {
      search: '<',
      selected: '<'
    },
    link: function(s, e, a, controller) {
      SearchFilters.facility(function(facilities) {
        controller.setFilter({ facilities });
        controller.search();
      });
    }
  };
});
