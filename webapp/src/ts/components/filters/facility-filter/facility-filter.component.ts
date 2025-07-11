import { Component, EventEmitter, Output, Input, OnInit, AfterViewInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { sortBy as _sortBy } from 'lodash-es';

import { GlobalActions } from '@mm-actions/global';
import { PlaceHierarchyService } from '@mm-services/place-hierarchy.service';
import { SessionService } from '@mm-services/session.service';
import { TranslateService } from '@mm-services/translate.service';
import { Filter } from '@mm-components/filters/filter';
import { Selectors } from '@mm-selectors/index';
import { NgFor, NgTemplateOutlet, NgClass, NgIf, AsyncPipe } from '@angular/common';

@Component({
  selector: 'mm-facility-filter',
  templateUrl: './facility-filter.component.html',
  imports: [NgFor, NgTemplateOutlet, NgClass, NgIf, AsyncPipe]
})
export class FacilityFilterComponent implements OnInit, AfterViewInit {
  private globalActions: GlobalActions;
  private isOnlineOnly;
  filter: Filter;
  facilities: Record<string, any>[] = [];
  displayedFacilities: Record<string, any>[] = [];

  private totalFacilitiesDisplayed = 0;
  private togglingFacilities = false;
  private subscriptions: Subscription = new Subscription();

  @Input() disabled;
  @Input() fieldId;
  // eslint-disable-next-line @angular-eslint/no-output-native
  @Output() search: EventEmitter<any> = new EventEmitter();

  constructor(
    private store:Store,
    private placeHierarchyService:PlaceHierarchyService,
    private translateService:TranslateService,
    private sessionService:SessionService,
  ) {
    this.globalActions = new GlobalActions(store);
    this.filter = new Filter(this.applyFilter.bind(this));
  }

  ngOnInit() {
    this.isOnlineOnly = this.sessionService.isOnlineOnly();
  }

  ngAfterViewInit() {
    this.subscribeToSidebarStore();
  }

  private subscribeToSidebarStore() {
    const subscription = this.store
      .select(Selectors.getSidebarFilter)
      .subscribe(sidebarFilter => {
        if (sidebarFilter?.isOpen && !this.facilities?.length) {
          return this.loadFacilities();
        }
      });
    this.subscriptions.add(subscription);
  }

  // this method is called on dropdown open
  loadFacilities() {
    if (this.facilities.length) {
      this.displayOneMoreFacility();
      return Promise.resolve();
    }

    return this.placeHierarchyService
      .get()
      .then((hierarchy = []) => {
        this.facilities = this.sortHierarchyAndAddFacilityLabels(hierarchy);
        this.displayedFacilities = this.facilities;
      })
      .catch(err => console.error('Error loading facilities', err));
  }

  private displayOneMoreFacility() {
    if (this.totalFacilitiesDisplayed >= this.facilities.length) {
      return;
    }

    this.totalFacilitiesDisplayed += 1;
    this.displayedFacilities = this.facilities.slice(0, this.totalFacilitiesDisplayed);
  }

  async setDefault(facility) {
    if (!facility) {
      // Should avoid dead-ends and apply empty filter.
      this.applyFilter();
      return;
    }

    const descendants = await this.placeHierarchyService.getDescendants(facility._id, true);
    const descendantIds = descendants.map(descendant => descendant.doc._id);
    this.toggle(facility._id, [ facility._id, ...descendantIds ]);
  }

  private sortHierarchyAndAddFacilityLabels(hierarchy) {
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

  applyFilter(facilityIds: string[] = []) {
    if (this.disabled || this.togglingFacilities) {
      return;
    }

    let selectedFacilities;

    if (facilityIds.length) {
      selectedFacilities = { selected: facilityIds };
    }

    this.globalActions.setFilter({ facilities: selectedFacilities });
    this.search.emit();
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

  private toggle(facilityId, hierarchy:string[]) {
    this.togglingFacilities = true;
    const newToggleValue = !this.filter.selected.has(facilityId);

    // Exclude places with already correct toggle state, then toggle the rest.
    hierarchy
      .filter(facilityId => this.filter.selected.has(facilityId) !== newToggleValue)
      .forEach(facilityId => this.filter.toggle(facilityId));

    this.togglingFacilities = false;
    this.applyFilter(Array.from(this.filter.selected) as string[]);
  }

  itemLabel(facility) {
    if (facility?.doc?.name) {
      return Promise.resolve(facility.doc.name);
    }

    return this.translateService.get(this.isOnlineOnly ? 'place.deleted' : 'place.unavailable');
  }

  clear() {
    if (this.disabled) {
      return;
    }

    this.filter.clear();
  }

  countSelected() {
    return this.filter?.countSelected();
  }

  select(selectedParent, facility, isCheckBox = false) {
    if (!isCheckBox) {
      facility.toggle = !facility.toggle;
      return;
    }

    if (selectedParent || this.disabled) {
      return;
    }

    const hierarchy = this
      .getFacilitiesRecursive(facility)
      .map(descendant => descendant.doc._id);
    this.toggle(facility.doc._id, hierarchy);
  }
}
