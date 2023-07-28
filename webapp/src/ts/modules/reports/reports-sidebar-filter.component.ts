import { AfterViewInit, Component, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';

import { GlobalActions } from '@mm-actions/global';
import { FormTypeFilterComponent } from '@mm-components/filters/form-type-filter/form-type-filter.component';
import { FacilityFilterComponent } from '@mm-components/filters/facility-filter/facility-filter.component';
import { DateFilterComponent } from '@mm-components/filters/date-filter/date-filter.component';
import { StatusFilterComponent } from '@mm-components/filters/status-filter/status-filter.component';
import { TelemetryService } from '@mm-services/telemetry.service';

@Component({
  selector: 'mm-reports-sidebar-filter',
  templateUrl: './reports-sidebar-filter.component.html'
})
export class ReportsSidebarFilterComponent implements AfterViewInit, OnDestroy {
  @Output() search: EventEmitter<any> = new EventEmitter();
  @Input() disabled;

  @ViewChild(FormTypeFilterComponent)
  formTypeFilter: FormTypeFilterComponent;

  @ViewChild(FacilityFilterComponent)
  facilityFilter: FacilityFilterComponent;

  @ViewChild('fromDate')
  fromDateFilter: DateFilterComponent;

  @ViewChild('toDate')
  toDateFilter: DateFilterComponent;

  @ViewChild(StatusFilterComponent)
  statusFilter: StatusFilterComponent;

  private globalActions;
  private filters = [];
  isResettingFilters = false;
  isOpen = false;
  filterCount:any = { };
  dateFilterError = '';

  constructor(
    private store: Store,
    private telemetryService: TelemetryService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngAfterViewInit() {
    this.filters = [
      this.formTypeFilter,
      this.facilityFilter,
      this.fromDateFilter,
      this.toDateFilter,
      this.statusFilter,
    ];
  }

  applyFilters() {
    if (this.isResettingFilters || this.disabled) {
      return;
    }
    this.search.emit();
    this.countSelected();
  }

  clearFilters(fieldIds?) {
    if (this.disabled) {
      return;
    }
    const filters = fieldIds ? this.filters.filter(filter => fieldIds.includes(filter.fieldId)) : this.filters;
    filters.forEach(filter => filter.clear());
  }

  countSelected() {
    this.filterCount.total = 0;
    this.filters.forEach(filter => {
      const count = filter.countSelected() || 0;
      this.filterCount.total += count;
      this.filterCount[filter.fieldId] = count;
    });
    this.globalActions.setSidebarFilter({ filterCount: { ...this.filterCount }});
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
    this.isOpen = !this.isOpen;
    this.globalActions.setSidebarFilter({ isOpen: this.isOpen });

    if (this.isOpen) {
      // Counting every time the user opens the sidebar filter in reports tab.
      this.telemetryService.record('sidebar_filter:reports:open');
    }
  }

  showDateFilterError(error) {
    this.dateFilterError = error || '';
  }

  setDefaultFacilityFilter(filters) {
    this.facilityFilter?.setDefault(filters?.facility);
  }

  ngOnDestroy() {
    this.globalActions.clearSidebarFilter();
    this.globalActions.clearFilters();
  }
}
