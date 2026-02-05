import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { Place } from '@medic/cht-datasource';

import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { SettingsService } from '@mm-services/settings.service';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatAccordion } from '@angular/material/expansion';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { TelemetryService } from '@mm-services/telemetry.service';
import { SidebarFilterState } from '@mm-reducers/global';

export enum ReportingPeriod {
  CURRENT = 'current',
  PREVIOUS = 'previous'
}

export type AnalyticsSidebarFilterState =  SidebarFilterState & {
  facility?: Place.v1.Place,
  reportingPeriod?: ReportingPeriod
};

@Component({
  selector: 'mm-analytics-sidebar-filter',
  templateUrl: './analytics-sidebar-filter.component.html',
  imports: [NgClass, MatIcon, MatAccordion, NgIf, NgFor, FormsModule, TranslatePipe]
})
export class AnalyticsSidebarFilterComponent implements OnInit, OnDestroy {
  static readonly DEFAULT_REPORTING_PERIOD = ReportingPeriod.CURRENT;

  @Input() userFacilities: Place.v1.Place[] = [];
  @Input() showFacilityFilter = true;
  @Input() telemetryKey: string = 'target_aggregates';
  @Output() facilitySelectionChanged = new EventEmitter<Place.v1.Place>();
  @Output() reportingPeriodSelectionChanged = new EventEmitter<ReportingPeriod>();
  private readonly globalActions;
  readonly reportingPeriods = [
    { value: ReportingPeriod.CURRENT, label: 'targets.this_month.subtitle' },
    { value: ReportingPeriod.PREVIOUS, label: 'targets.last_month.subtitle' }
  ];

  DEFAULT_FACILITY_LABEL = 'Facility';
  subscriptions: Subscription = new Subscription();
  facilityFilterLabel;
  filterState: AnalyticsSidebarFilterState = {};

  constructor(
    private  readonly store: Store,
    private readonly contactTypesService: ContactTypesService,
    private readonly settingsService: SettingsService,
    private readonly telemetryService: TelemetryService
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit() {
    this.subscribeToStore();
    this.setFacilityLabel();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private subscribeToStore() {
    const subscription = this.store
      .select(Selectors.getSidebarFilter)
      .subscribe((filterState) => {
        if (!filterState) {
          return;
        }
        this.filterState = filterState;
        const total = this.calculateTotalFilterCount(filterState);
        if (filterState.filterCount?.total !== total) {
          this.globalActions.setSidebarFilter({ filterCount: { total } });
        }
      });
    this.subscriptions.add(subscription);
  }

  private calculateTotalFilterCount(filterState: AnalyticsSidebarFilterState) {
    const reportingPeriodCount = filterState.reportingPeriod === ReportingPeriod.PREVIOUS ? 1 : 0;
    const facilityCount = this.userFacilities.length > 1 ? 1 : 0;
    return reportingPeriodCount + facilityCount;
  }

  toggleSidebarFilter() {
    this.globalActions.setSidebarFilter({ isOpen: !this.filterState.isOpen });
  }

  private async setFacilityLabel() {
    if (!this.userFacilities?.length) {
      this.facilityFilterLabel = this.DEFAULT_FACILITY_LABEL;
      return;
    }

    try {
      const facility = this.userFacilities[0];
      const settings = await this.settingsService.get();
      const userFacilityType = this.contactTypesService.getTypeId(facility);
      const placeType = settings.contact_types.find(type => type.id === userFacilityType);
      this.facilityFilterLabel = placeType?.name_key || this.DEFAULT_FACILITY_LABEL;
    } catch (err) {
      console.error('Error fetching facility label', err);
      this.facilityFilterLabel = this.DEFAULT_FACILITY_LABEL;
    }
  }

  fetchAggregateTargetsByFacility(facility: Place.v1.Place) {
    this.facilitySelectionChanged.emit(facility);
    this.collectFilterSelectionTelemetry('facility');
  }

  fetchAggregateTargetsByReportingPeriod(reportingPeriod: ReportingPeriod) {
    this.reportingPeriodSelectionChanged.emit(reportingPeriod);
    this.collectFilterSelectionTelemetry('reporting-period');
  }

  private collectFilterSelectionTelemetry(filter) {
    this.telemetryService.record(`sidebar_filter:analytics:${this.telemetryKey}:${filter}:select`);
  }
}
