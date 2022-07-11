import { AfterViewInit, Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';

import { GlobalActions } from '@mm-actions/global';
import { FormTypeFilterComponent } from '@mm-components/filters/form-type-filter/form-type-filter.component';
import { FacilityFilterComponent } from '@mm-components/filters/facility-filter/facility-filter.component';
import { DateFilterComponent } from '@mm-components/filters/date-filter/date-filter.component';
import { StatusFilterComponent } from '@mm-components/filters/status-filter/status-filter.component';
import { ResponsiveService } from '@mm-services/responsive.service';

@Component({
  selector: 'mm-reports-sidebar-filter',
  templateUrl: './reports-sidebar-filter.component.html'
})
export class ReportsSidebarFilterComponent implements AfterViewInit {
  @Output() search: EventEmitter<any> = new EventEmitter();
  @Output() onFilterChange: EventEmitter<any> = new EventEmitter();
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
  isMobile = false;
  isResettingFilters = false;
  filters = [];
  sideBarFilter:any = {
    isFilterOpen: false,
    filterCount: { },
  };

  constructor(
    private store: Store,
    private responsiveService: ResponsiveService,
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

  applyFilters(force?) {
    // Todo what happens to the search if just one date is set
    if (this.isResettingFilters) {
      return;
    }
    this.search.emit(force);
    this.countSelected();
  }

  clearFilters(fieldIds?) {
    const filters = fieldIds ? this.filters.filter(filter => fieldIds.includes(filter.fieldId)) : this.filters;
    filters.forEach(filter => filter?.clear());
  }

  countSelected() {
    this.sideBarFilter.filterCount.total = 0;
    this.filters.forEach(filter => {
      if (!filter?.countSelected) {
        return;
      }
      const count = filter.countSelected() || 0;
      this.sideBarFilter.filterCount.total += count;
      this.sideBarFilter.filterCount[filter.fieldId] = count;
    });
    this.onFilterChange.emit(this.sideBarFilter);
  }

  resetFilters() {
    this.isResettingFilters = true;
    this.globalActions.clearFilters();
    this.clearFilters();
    this.isResettingFilters = false;
    this.applyFilters();
  }

  toggleSidebarFilter(open) {
    this.isMobile = this.responsiveService.isMobile();
    this.sideBarFilter.isFilterOpen = !!open;
    this.onFilterChange.emit(this.sideBarFilter);
  }
}
