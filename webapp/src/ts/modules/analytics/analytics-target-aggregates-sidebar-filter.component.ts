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
  subscriptions: Subscription = new Subscription();
  error;
  isOpen = false;
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
      await this.setFacilityLabel();
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
    const FACILITY = 'Facility';
    if (!this.selectedFacility) {
      this.facilityFilterLabel = FACILITY;
      return;
    }

    try {
      const settings = await this.settingsService.get();
      const userFacilityType = this.contactTypesService.getTypeId(this.selectedFacility);
      const placeType = settings.contact_types.find(type => type.id === userFacilityType);

      this.facilityFilterLabel = placeType?.name_key || FACILITY;
    } catch (err) {
      this.error = true;
      console.error('Error fetching facility label', err);
      this.facilityFilterLabel = FACILITY;
    }
  }

  fetchAggregateTargets(facility) {
    this.selectedFacility = facility;
    this.facilitySelected.emit(this.selectedFacility);
  }
}
