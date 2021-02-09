import { Component, EventEmitter, OnDestroy, Output, ViewChild, Input, OnInit, NgZone } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription, from } from 'rxjs';
import { flatten as _flatten, sortBy as _sortBy } from 'lodash-es';
import { TranslateService } from '@ngx-translate/core';

import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';
import {
  MultiDropdownFilterComponent,
  MultiDropdownFilter,
} from '@mm-components/filters/multi-dropdown-filter/multi-dropdown-filter.component';
import { PlaceHierarchyService } from '@mm-services/place-hierarchy.service';
import { AbstractFilter } from '@mm-components/filters/abstract-filter';

@Component({
  selector: 'mm-facility-filter',
  templateUrl: './facility-filter.component.html'
})
export class FacilityFilterComponent implements OnDestroy, OnInit, AbstractFilter {
  subscription:Subscription = new Subscription();
  private globalActions;
  isAdmin;

  facilities = [];
  flattenedFacilities = [];
  displayedFacilities = [];
  private totalFacilitiesDisplayed = 0;
  private scrollDisplayed = false;
  private scrollEventEnabled = false;
  private displayingMoreFacilities = false;

  @Input() disabled;
  @Output() search: EventEmitter<any> = new EventEmitter();
  @ViewChild(MultiDropdownFilterComponent)
  dropdownFilter = new MultiDropdownFilter(); // initialize variable to avoid change detection errors

  constructor(
    private store:Store,
    private placeHierarchyService:PlaceHierarchyService,
    private translateService:TranslateService,
    private ngZone:NgZone,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit() {
    const subscription = combineLatest(
      this.store.select(Selectors.getIsAdmin),
    ).subscribe(([
      isAdmin,
    ]) => {
      this.isAdmin = isAdmin;
    });
    this.subscription.add(subscription);
  }

  loadFacilities() {
    if (this.facilities.length) {
      this.displayOneMoreFacility();
      return;
    }

    return this.placeHierarchyService
      .get()
      .then(hierarchy => {
        hierarchy = this.sortHierarchyAndAddLabels(hierarchy);
        this.facilities = hierarchy;
        this.flattenedFacilities = _flatten(this.facilities.map(facility => this.getFacilitiesRecursive(facility)));
        this.displayOneMoreFacility();
      })
      .catch(err => console.error('Error loading facilities', err));
  }

  private displayOneMoreFacility() {
    if (this.totalFacilitiesDisplayed > this.facilities.length) {
      return;
    }

    this.totalFacilitiesDisplayed += 1;
    this.displayedFacilities = this.facilities.slice(0, this.totalFacilitiesDisplayed);
  }

  private enableOnScrollEvent() {
    this.ngZone.runOutsideAngular(() => {
      $('#facility-dropdown-list').on('scroll', (event) => {
        // the scroll event is triggered for every scrolled pixel.
        // don't queue displaying another facility if the previous one hasn't been yet displayed
        if (this.displayingMoreFacilities) {
          return;
        }
        // visible height + pixel scrolled >= total height - 100
        if (event.target.offsetHeight + event.target.scrollTop >= event.target.scrollHeight - 100) {
          this.displayingMoreFacilities = true;
          setTimeout(() => {
            this.ngZone.run(() => this.displayOneMoreFacility());
          });
        }
      });
    });
  }

  ngAfterViewChecked() {
    // we've displayed all facilities, next scroll should load more
    this.displayingMoreFacilities = false;

    // add the scroll event listener after we have a list element to attach it to!
    if (!this.scrollEventEnabled && this.facilities.length) {
      this.scrollEventEnabled = true;
      this.enableOnScrollEvent();
    }

    // keep displaying facilities until we have a scroll or we've displayed all
    if (!this.scrollDisplayed && this.facilities.length && this.totalFacilitiesDisplayed < this.facilities.length) {
      const listHeight = $('#facility-dropdown-list')[0].scrollHeight;
      if (listHeight < 301) { // 300 is maximum height
        setTimeout(() => this.displayOneMoreFacility());
      } else {
        this.scrollDisplayed = true;
      }
    }
  }

  private sortHierarchyAndAddLabels(hierarchy) {
    const sortChildren = (facility) => {
      facility.label = this.itemLabel(facility);
      if (!facility.children || !facility.children.length) {
        return;
      }

      facility.children = _sortBy(facility.children, iteratee => iteratee.doc?.name);
      facility.children.forEach(child => sortChildren(child));
    };

    hierarchy.forEach(facility => {
      facility.label = this.itemLabel(facility);
      sortChildren(facility);
    });

    return _sortBy(hierarchy, iteratee => iteratee.doc?.name);
  }

  applyFilter(facilities) {
    const facilityIds = facilities.map(facility => facility.doc?._id);
    this.globalActions.setFilter({ facilities: { selected: facilityIds } });
    this.search.emit();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  trackByFn(idx, facility) {
    return `${facility.doc?._id}${facility.doc?._rev}`;
  }

  private getFacilitiesRecursive(parent) {
    let facilities:any = [parent];
    parent.children?.forEach(child => {
      facilities = [...facilities, ...this.getFacilitiesRecursive(child)];
    });
    return facilities;
  }

  toggle(facility) {
    const recursiveFacilities = this.getFacilitiesRecursive(facility);
    recursiveFacilities.forEach(facility => this.dropdownFilter.toggle(facility));
  }

  itemLabel(facility) {
    if (facility.doc && facility.doc.name) {
      return from([facility.doc.name]);
    }

    return this.translateService.get(this.isAdmin ? 'place.deleted' : 'place.unavailable');
  }

  clear() {
    this.dropdownFilter?.clear(false);
  }
}
