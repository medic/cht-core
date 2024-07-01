import { AfterViewInit, Component, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';

import { GlobalActions } from '@mm-actions/global';
import { DateFilterComponent } from '@mm-components/filters/date-filter/date-filter.component';
import { TelemetryService } from '@mm-services/telemetry.service';

type FilterComponent = DateFilterComponent ;

@Component({
  selector: 'mm-analytics-target-aggregates-sidebar-filter',
  templateUrl: './analytics-target-aggregates-sidebar-filter.component.html'
})
export class AnalyticsTargetAggregatesSidebarFilterComponent implements AfterViewInit, OnDestroy {
  @Output() search: EventEmitter<any> = new EventEmitter();
  @Input() disabled;


  @ViewChild('fromDate') fromDateFilter!: DateFilterComponent;
  @ViewChild('toDate') toDateFilter!: DateFilterComponent;

  private globalActions;
  private filters: FilterComponent[] = [];
  isResettingFilters = false;
  isOpen = false;
  dateFilterError = '';

  constructor(
    private store: Store,
    private telemetryService: TelemetryService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngAfterViewInit() {
    this.filters = [
      this.fromDateFilter,
      this.toDateFilter,
    ];
  }

  applyFilters() {
    if (this.isResettingFilters || this.disabled) {
      return;
    }
    this.search.emit();
  }

  clearFilters(fieldIds?) {
    if (this.disabled) {
      return;
    }
    const filters = fieldIds ? this.filters.filter(filter => fieldIds.includes(filter.fieldId)) : this.filters;
    filters.forEach(filter => filter.clear());
  }

  resetFilters() {
    if (this.disabled) {
      return;
    }
    this.isResettingFilters = true;
    this.globalActions.clearFilters('search');
    this.clearFilters();
    this.isResettingFilters = false;
    this.applyFilters();
  }

  toggleSidebarFilter() {
    console.log('clicked from filter');
    this.isOpen = !this.isOpen;
    console.log('Sidebar isOpen:', this.isOpen);
    this.globalActions.setSidebarFilter({ isOpen: this.isOpen });

    if (this.isOpen) {
      // Counting every time the user opens the sidebar filter in analytics_targets_aggregrate tab.
      this.telemetryService.record('sidebar_filter:analytics_target_aggregates:open');
    }
  }

  showDateFilterError(error) {
    this.dateFilterError = error || '';
  }

  ngOnDestroy() {
    this.globalActions.clearSidebarFilter();
    this.globalActions.clearFilters();
  }
}
