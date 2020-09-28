import { Component, EventEmitter, OnDestroy, ChangeDetectorRef, Output, ViewChild } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { Selectors } from '../../../selectors';
import { combineLatest, Subscription } from 'rxjs';
import { GlobalActions } from '../../../actions/global';
import { MultiDropdownFilterComponent } from '@mm-components/multi-dropdown-filter/mullti-dropdown-filter.component';
import { PlaceHierarchyService } from '../../../services/place-hierarchy.service';
import { sortBy as _sortBy } from 'lodash-es';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'mm-facility-filter',
  templateUrl: './facility-filter.component.html'
})
export class FacilityFilterComponent implements OnDestroy {
  private subscription: Subscription = new Subscription();
  private globalActions;
  isAdmin;
  selectMode;
  selectedReports;

  facilities = [];
  totalFacilitiesDisplayed = 0;

  @Output() search: EventEmitter<any> = new EventEmitter();
  @ViewChild(MultiDropdownFilterComponent)
  dropdownFilter: MultiDropdownFilterComponent;

  constructor(
    private store:Store,
    private cd: ChangeDetectorRef,
    private placeHierarchyService:PlaceHierarchyService,
    private translateService:TranslateService,
  ) {
    const subscription = combineLatest(
      this.store.pipe(select(Selectors.getIsAdmin)),
      this.store.pipe(select(Selectors.getSelectMode)),
      this.store.pipe(select(Selectors.getSelectedReports))
    ).subscribe(([
      isAdmin,
      selectMode,
      selectedReports,
    ]) => {
      this.isAdmin = isAdmin;
      this.selectMode = selectMode;
      this.selectedReports = selectedReports;
    });
    this.subscription.add(subscription);
    this.globalActions = new GlobalActions(store);
  }

  loadFacilities() {
    if (this.facilities.length) {
      this.totalFacilitiesDisplayed += 1;
      return;
    }

    return this.placeHierarchyService
      .get()
      .then(hierarchy => {
        // todo sort!
        hierarchy = this.sortHierarchy(hierarchy);
        this.facilities = hierarchy;
        this.totalFacilitiesDisplayed += 1;
      })
      .catch(err => console.error('Error loading facilities', err));

   /* $('#facilityDropdown span.dropdown-menu > ul').scroll((event) => {
      // visible height + pixel scrolled >= total height - 100
      if (event.target.offsetHeight + event.target.scrollTop >= event.target.scrollHeight - 100) {
        $timeout(() => ctrl.totalFacilitiesDisplayed += 1);
      }
    });*/
  }

  private sortHierarchy(hierarchy) {
    const sortChildren = (facility) => {
      facility.children = _sortBy(facility.children, 'name');
      facility.children.forEach(child => sortChildren(child));
    }

    hierarchy.forEach(facility => sortChildren(facility));

    return _sortBy(hierarchy, 'name');
  }

  ngAfterViewInit() {
    // this is needed because the change detection doesn't run normally at this point, and we're using the
    // child component's methods in the view.
    this.cd.detectChanges();
  }

  applyFilter(facilities) {
    this.globalActions.setFilter({ facilities: { selected: facilities.map(facility => facility.doc._id) } });
    this.search.emit();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  trackByFn(idx, facility) {
    return facility.doc._id;
  }

  toggle(facility) {
    this.dropdownFilter.toggle(facility);
    facility.children?.forEach(child => this.dropdownFilter.toggle(child));
  }

  itemLabel(facility) {
    return facility?.doc?.name || this.translateService.get(this.isAdmin ? 'place.deleted' : 'place.unavailable');
  }
}


/*angular.module('inboxDirectives').directive('mmFacilityFilter', function(SearchFilters) {
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
});*/
