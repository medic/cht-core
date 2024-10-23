import { AfterViewInit, Component, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';

import { GlobalActions } from '@mm-actions/global';
import { FacilityFilterComponent } from '@mm-components/filters/facility-filter/facility-filter.component';
import { TelemetryService } from '@mm-services/telemetry.service';

type FilterComponent = FacilityFilterComponent;

@Component({
  selector: 'mm-tasks-sidebar-filter',
  templateUrl: './tasks-sidebar-filter.component.html'
})
export class TasksSidebarFilterComponent implements AfterViewInit, OnDestroy {
  @Output() search: EventEmitter<any> = new EventEmitter();
  @Input() disabled;

  @ViewChild(FacilityFilterComponent)
  facilityFilter: FacilityFilterComponent;

  private globalActions;
  private filters: FilterComponent[] = [];
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
      this.facilityFilter,
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