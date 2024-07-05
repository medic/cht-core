import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { Store } from '@ngrx/store';

import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { GetDataRecordsService } from '@mm-services/get-data-records.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { UserSettingsService } from '@mm-services/user-settings.service';

@Component({
  selector: 'mm-analytics-target-aggregates-sidebar-filter',
  templateUrl: './analytics-target-aggregates-sidebar-filter.component.html'
})
export class AnalyticsTargetAggregatesSidebarFilterComponent implements OnInit, OnDestroy {
  @Output() search: EventEmitter<any> = new EventEmitter();
  @Input() disabled;

  private globalActions;
  subscriptions: Subscription = new Subscription();
  isOpen = false;

  constructor(
    private store: Store,
    private getDataRecordsService: GetDataRecordsService,
    private telemetryService: TelemetryService,
    private userSettingsService: UserSettingsService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit() {
    this.subscribeToStore();
    this.getUserFacility();
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
        return this.getFacilityPlaces(userSettings.facility_id);
      });
  }

  private getFacilityPlaces(facilityId) {
    return this.getDataRecordsService
      .get(facilityId)
      .then(places => {
        console.log('places', places);
      });
  }
}
