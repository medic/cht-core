import {
  Component,
  EventEmitter,
  Output,
  ViewChild,
  Input,
  OnInit,
  NgZone,
  AfterViewChecked,
  AfterViewInit
} from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { flatten as _flatten, sortBy as _sortBy } from 'lodash-es';

import { GlobalActions } from '@mm-actions/global';
import {
  MultiDropdownFilterComponent,
  MultiDropdownFilter,
} from '@mm-components/filters/multi-dropdown-filter/multi-dropdown-filter.component';
import { PlaceHierarchyService } from '@mm-services/place-hierarchy.service';
import { AbstractFilter } from '@mm-components/filters/abstract-filter';
import { SessionService } from '@mm-services/session.service';
import { TranslateService } from '@mm-services/translate.service';
import { InlineFilter } from '@mm-components/filters/inline-filter';
import { Selectors } from '@mm-selectors/index';

@Component({
  selector: 'mm-facility-filter',
  templateUrl: './facility-filter.component.html'
})
export class FacilityFilterComponent implements OnInit, AfterViewInit, AbstractFilter, AfterViewChecked {
  private globalActions;
  private isOnlineOnly;
  inlineFilter: InlineFilter;
  facilities: Record<string, any>[] = [];
  flattenedFacilities: any[] = [];
  displayedFacilities: Record<string, any>[] = [];

  private totalFacilitiesDisplayed = 0;
  private listHasScroll = false;
  private togglingFacilities = false;
  private scrollEventListenerAdded = false;
  private displayNewFacilityQueued = false;
  private readonly MAX_LIST_HEIGHT = 300; // this is set in CSS
  private subscriptions: Subscription = new Subscription();

  @Input() disabled;
  @Input() inline;
  @Input() fieldId;
  @Output() search: EventEmitter<any> = new EventEmitter();
  @ViewChild(MultiDropdownFilterComponent)
  dropdownFilter = new MultiDropdownFilter(); // initialize variable to avoid change detection errors

  constructor(
    private store:Store,
    private placeHierarchyService:PlaceHierarchyService,
    private translateService:TranslateService,
    private ngZone:NgZone,
    private sessionService:SessionService,
  ) {
    this.globalActions = new GlobalActions(store);
    this.inlineFilter = new InlineFilter(this.applyFilter.bind(this));
  }

  ngOnInit() {
    this.isOnlineOnly = this.sessionService.isOnlineOnly();
  }

  ngAfterViewInit() {
    if (this.inline) {
      this.subscribeToSidebarStore();
    }
  }

  private subscribeToSidebarStore() {
    const subscription = this.store
      .select(Selectors.getSidebarFilter)
      .subscribe(sidebarFilter => {
        if (sidebarFilter?.isOpen && !this.facilities?.length) {
          this.loadFacilities();
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
        if (this.inline) {
          this.displayedFacilities = this.facilities;
        } else {
          this.flattenedFacilities = _flatten(this.facilities.map(facility => this.getFacilitiesRecursive(facility)));
          this.displayOneMoreFacility();
        }
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

  private addOnScrollEventListener() {
    if (this.scrollEventListenerAdded || !this.facilities.length) {
      return;
    }

    this.scrollEventListenerAdded = true;
    this.ngZone.runOutsideAngular(() => {
      $('#facility-dropdown-list').on('scroll', (event) => {
        // the scroll event is triggered for every scrolled pixel.
        // don't queue displaying another facility if the previous one hasn't yet been displayed
        if (this.displayNewFacilityQueued) {
          return;
        }
        // visible height + pixel scrolled >= total height - 100
        if (event.target.offsetHeight + event.target.scrollTop >= event.target.scrollHeight - 100) {
          this.displayNewFacilityQueued = true;
          setTimeout(() => {
            this.ngZone.run(() => this.displayOneMoreFacility());
          });
        }
      });
    });
  }

  ngAfterViewChecked() {
    if (this.inline) {
      return;
    }
    // add the scroll event listener after we have a list element to attach it to!
    this.addOnScrollEventListener();

    // we've displayed the queued facility within this change detection cycle, next scroll should load one more
    this.displayNewFacilityQueued = false;

    // keep displaying facilities until we have a scroll or we've displayed all
    if (!this.listHasScroll && this.facilities.length && this.totalFacilitiesDisplayed < this.facilities.length) {
      const listHeight = $('#facility-dropdown-list')[0]?.scrollHeight;
      const hasScroll = listHeight > this.MAX_LIST_HEIGHT;
      if (!hasScroll) {
        setTimeout(() => this.displayOneMoreFacility());
      } else {
        this.listHasScroll = true;
      }
    }
  }

  async setDefault(facility) {
    if (!facility) {
      // Should avoid dead-ends and apply empty filter.
      this.applyFilter();
      return;
    }

    const descendants = await this.placeHierarchyService.getDescendants(facility._id, true);
    const descendantIds = descendants.map(descendant => descendant.doc._id);
    this.toggle(facility._id, [ facility._id, ...descendantIds ], this.inlineFilter);
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

  private toggle(facilityId, hierarchy:string[], filter) {
    this.togglingFacilities = true;
    const newToggleValue = !filter.selected.has(facilityId);

    // Exclude places with already correct toggle state, then toggle the rest.
    hierarchy
      .filter(facilityId => filter.selected.has(facilityId) !== newToggleValue)
      .forEach(facilityId => filter.toggle(facilityId));

    this.togglingFacilities = false;
    this.applyFilter(Array.from(filter.selected));
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

    if (this.inline) {
      this.inlineFilter.clear();
      return;
    }

    this.dropdownFilter?.clear(false);
  }

  countSelected() {
    return this.inline && this.inlineFilter?.countSelected();
  }

  select(selectedParent, facility, filter, isCheckBox = false) {
    if (!isCheckBox && this.inline) {
      facility.toggle = !facility.toggle;
      return;
    }

    if (selectedParent || this.disabled) {
      return;
    }

    const hierarchy = this
      .getFacilitiesRecursive(facility)
      .map(descendant => descendant.doc._id);
    this.toggle(facility.doc._id, hierarchy, filter);
  }
}
