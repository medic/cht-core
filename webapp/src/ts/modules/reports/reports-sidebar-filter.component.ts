import { AfterViewInit, Component, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';

import { SearchFiltersService } from '@mm-services/search-filters.service';
import { GlobalActions } from '@mm-actions/global';
import { FreetextFilterComponent } from '@mm-components/filters/freetext-filter/freetext-filter.component';
import { FormTypeFilterComponent } from '@mm-components/filters/form-type-filter/form-type-filter.component';
import { FacilityFilterComponent } from '@mm-components/filters/facility-filter/facility-filter.component';
import { DateFilterComponent } from '@mm-components/filters/date-filter/date-filter.component';
import { StatusFilterComponent } from '@mm-components/filters/status-filter/status-filter.component';

@Component({
  selector: 'mm-reports-sidebar-filter',
  templateUrl: './reports-sidebar-filter.component.html'
})
export class ReportsSidebarFilterComponent implements AfterViewInit, OnDestroy {
  @Output() search: EventEmitter<any> = new EventEmitter();
  @Input() disabled;

  @ViewChild(FreetextFilterComponent)
  freetextFilter: FreetextFilterComponent;

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
  isResettingFilters = false;
  isFilterOpen = false;
  filterCount:any = {};
  filters = [];

  constructor(
    private store: Store,
    private searchFiltersService: SearchFiltersService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngAfterViewInit() {
    this.filters = [
      this.freetextFilter,
      this.formTypeFilter,
      this.facilityFilter,
      this.fromDateFilter,
      this.toDateFilter,
      this.statusFilter,
    ];
    this.searchFiltersService.init(this.freetextFilter);
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
    this.filterCount.total = 0;
    this.filters.forEach(filter => {
      if (!filter?.countSelected) {
        return;
      }
      const count = filter.countSelected() || 0;
      this.filterCount.total += count;
      this.filterCount[filter.fieldId] = count;
    });
  }

  resetFilters() {
    this.isResettingFilters = true;
    this.globalActions.clearFilters();
    this.clearFilters();
    this.isResettingFilters = false;
    this.applyFilters();
  }

  closeSidebarFilter() {
    this.isFilterOpen = false;
  }

  ngOnDestroy() {
    this.searchFiltersService.destroy();
  }
}
