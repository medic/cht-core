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

@Component({
  selector: 'mm-facility-filter',
  templateUrl: './facility-filter.component.html'
})
export class FacilityFilterComponent implements OnInit, AfterViewInit, AbstractFilter, AfterViewChecked {
  private globalActions;
  private isOnlineOnly;
  inlineFilter: InlineFilter;
  facilities = [];
  flattenedFacilities: any[] = [];
  displayedFacilities = [];

  private loadingFacilities;
  private totalFacilitiesDisplayed = 0;
  private listHasScroll = false;
  private togglingFacilities = false;
  private scrollEventListenerAdded = false;
  private displayNewFacilityQueued = false;
  private readonly MAX_LIST_HEIGHT = 300; // this is set in CSS

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
      this.loadingFacilities = this.loadFacilities();
    }
  }

  // this method is called on dropdown open
  loadFacilities() {
    if (this.facilities.length) {
      this.displayOneMoreFacility();
      return;
    }

    return this.placeHierarchyService
      .get()
      .then((hierarchy = []) => {
        hierarchy = this.sortHierarchyAndAddFacilityLabels(hierarchy);
        this.facilities = hierarchy;
        this.flattenedFacilities = _flatten(this.facilities.map(facility => this.getFacilitiesRecursive(facility)));
        this.displayOneMoreFacility();
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

  async setDefault(facilityId) {
    await this.loadingFacilities;
    const facility = this.flattenedFacilities.find(facility => facility.doc?._id === facilityId);

    if (facility) {
      this.select(null, facility, this.inlineFilter, true);
      return;
    }

    // Should avoid dead-ends and apply empty filter.
    this.applyFilter();
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

  applyFilter(facilities: any[] = []) {
    if (this.disabled || this.togglingFacilities) {
      return;
    }

    const facilityIds = facilities.map(facility => facility.doc?._id);
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

  private toggle(facility, filter) {
    this.togglingFacilities = true;

    const recursiveFacilities = this.getFacilitiesRecursive(facility);
    const newToggleValue = !filter.selected.has(facility);
    // Exclude places with already correct toggle state, then toggle the rest.
    recursiveFacilities
      .filter(place => filter.selected.has(place) !== newToggleValue)
      .forEach(place => filter.toggle(place));

    this.togglingFacilities = false;
    this.applyFilter(Array.from(filter.selected));
  }

  itemLabel(facility) {
    if (facility.doc && facility.doc.name) {
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

    this.toggle(facility, filter);
  }
}
