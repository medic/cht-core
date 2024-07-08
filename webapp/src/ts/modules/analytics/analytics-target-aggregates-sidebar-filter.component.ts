import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Store } from '@ngrx/store';

import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { GetDataRecordsService } from '@mm-services/get-data-records.service';
import { SettingsService } from '@mm-services/settings.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { UserSettingsService } from '@mm-services/user-settings.service';

const FACILITY =  'Facility';
@Component({
  selector: 'mm-analytics-target-aggregates-sidebar-filter',
  templateUrl: './analytics-target-aggregates-sidebar-filter.component.html'
})
export class AnalyticsTargetAggregatesSidebarFilterComponent implements OnInit, OnDestroy {

  private globalActions;
  subscriptions: Subscription = new Subscription();
  error;
  isOpen = false;
  userFacilities;
  selectedFacilityId;
  facilityLabel;

  constructor(
    private store: Store,
    private contactTypesService: ContactTypesService,
    private getDataRecordsService: GetDataRecordsService,
    private settingsService: SettingsService,
    private telemetryService: TelemetryService,
    private userSettingsService: UserSettingsService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  async ngOnInit() {
    try {
      this.subscribeToStore();
      await this.getUserFacility();
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
    const subscription = this.store.select(Selectors.getSidebarFilter).subscribe(({ isOpen }) => {
      this.isOpen = isOpen;
    });
    this.subscriptions.add(subscription);
  }

  toggleSidebarFilter() {
    this.isOpen = !this.isOpen;
    this.globalActions.setSidebarFilter({ isOpen: this.isOpen });

    if (this.isOpen) {
      // Counting every time the user opens the sidebar filter in analytics_targets_aggregrate tab.
      this.telemetryService.record('sidebar_filter:analytics_target_aggregates:open');
    }
  }

  private getUserFacility() {
    return this.userSettingsService
      .get()
      .then((userSettings: any) => {
        return this.getPlaces(userSettings.facility_id);
      });
  }

  private getPlaces(facilityId) {
    return this.getDataRecordsService
      .get(facilityId)
      .then(places => {
        this.userFacilities = places;
        if (this.userFacilities) {
          this.selectedFacilityId = this.userFacilities[0]?._id;
        }
      });
  }

  private getFacilityType() {
    return this.contactTypesService.getTypeId(this.userFacilities[0]);
  }

  private setFacilityLabel() {
    return this.settingsService.get()
      .then((settings) => {
        const place = settings.contact_types.find(type => type.id === this.getFacilityType());
        this.facilityLabel = place.name_key;
      })
      .catch(error => {
        this.error = true;
        console.error('Error fetching facility label', error);
        this.facilityLabel = FACILITY;
      });
  }

  fetchAggregateTargets(facilityId) {
    this.selectedFacilityId = facilityId;
  }
}
