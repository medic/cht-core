import { Component, EventEmitter, OnDestroy, OnInit, Output, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { Store } from '@ngrx/store';

import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { SettingsService } from '@mm-services/settings.service';

@Component({
  selector: 'mm-analytics-target-aggregates-sidebar-filter',
  templateUrl: './analytics-target-aggregates-sidebar-filter.component.html'
})
export class AnalyticsTargetAggregatesSidebarFilterComponent implements OnInit, OnDestroy {

  @Input() userFacilities;
  @Output() facilitySelected = new EventEmitter<string>();
  private globalActions;
  DEFAULT_FACILITY_LABEL = 'Facility';
  subscriptions: Subscription = new Subscription();
  isOpen = false;
  error;
  selectedFacility;
  facilityFilterLabel;

  constructor(
    private store: Store,
    private contactTypesService: ContactTypesService,
    private settingsService: SettingsService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  async ngOnInit() {
    try {
      this.subscribeToStore();
      this.facilityFilterLabel = await this.setFacilityLabel() || this.DEFAULT_FACILITY_LABEL;
    } catch (err) {
      this.error = true;
      console.error('Error initializing Target Sidebar component', err);
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private subscribeToStore() {
    const subscription = this.store
      .select(Selectors.getSidebarFilter)
      .subscribe((filterState) => {
        this.isOpen = filterState?.isOpen ?? false;
        if (!this.selectedFacility && filterState?.defaultFilters?.facility) {
          this.selectedFacility = filterState.defaultFilters.facility;
        }
      });

    this.subscriptions.add(subscription);
  }

  toggleSidebarFilter() {
    this.isOpen = !this.isOpen;
    this.globalActions.setSidebarFilter({ isOpen: this.isOpen });
  }

  private async setFacilityLabel() {
    if (!this.userFacilities?.length) {
      return;
    }

    try {
      const facility = this.userFacilities[0];
      const settings = await this.settingsService.get();
      const userFacilityType = this.contactTypesService.getTypeId(facility);
      const placeType = settings.contact_types.find(type => type.id === userFacilityType);
      return placeType?.name_key;
    } catch (err) {
      this.error = true;
      console.error('Error fetching facility label', err);
    }
  }

  fetchAggregateTargets(facility) {
    this.selectedFacility = facility;
    this.facilitySelected.emit(this.selectedFacility);
  }
}
