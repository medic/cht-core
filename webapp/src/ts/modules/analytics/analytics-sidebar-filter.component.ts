import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
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

@Component({
  selector: 'mm-analytics-sidebar-filter',
  templateUrl: './analytics-sidebar-filter.component.html',
  imports: [NgClass, MatIcon, MatAccordion, NgIf, NgFor, FormsModule, TranslatePipe]
})
export class AnalyticsSidebarFilterComponent implements OnInit, OnDestroy, OnChanges {

  @Input() userFacilities: Place.v1.Place[] = [];
  @Input() selectedFacility?: Place.v1.Place;
  @Input() selectedReportingPeriod = ReportingPeriod.CURRENT;
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
  isOpen = false;
  facilityFilterLabel;

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

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedReportingPeriod'] || changes['selectedFacility']) {
      // Make sure the filter count is up to date.
      this.updateSidebarFilterState();
    }
  }

  private subscribeToStore() {
    const subscription = this.store
      .select(Selectors.getSidebarFilter)
      .subscribe((filterState) => this.isOpen = filterState.isOpen ?? false);
    this.subscriptions.add(subscription);
  }

  private getTotalFilterCount() {
    const reportingPeriodCount = this.selectedReportingPeriod === ReportingPeriod.PREVIOUS ? 1 : 0;
    const facilityCount = this.userFacilities.length > 1 ? 1 : 0;
    return reportingPeriodCount + facilityCount;
  }

  private updateSidebarFilterState() {
    this.globalActions.setSidebarFilter({
      isOpen: this.isOpen,
      filterCount: { total: this.getTotalFilterCount() }
    });
  }

  toggleSidebarFilter() {
    this.isOpen = !this.isOpen;
    this.updateSidebarFilterState();
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
    this.selectedFacility = facility;
    this.updateSidebarFilterState();
    this.facilitySelectionChanged.emit(this.selectedFacility);
    this.collectFilterSelectionTelemetry('facility');
  }

  fetchAggregateTargetsByReportingPeriod() {
    this.updateSidebarFilterState();
    this.reportingPeriodSelectionChanged.emit(this.selectedReportingPeriod);
    this.collectFilterSelectionTelemetry('reporting-period');
  }

  private collectFilterSelectionTelemetry(filter) {
    this.telemetryService.record(`sidebar_filter:analytics:${this.telemetryKey}:${filter}:select`);
  }
}

export enum ReportingPeriod {
  CURRENT = 'current',
  PREVIOUS = 'previous'
}
