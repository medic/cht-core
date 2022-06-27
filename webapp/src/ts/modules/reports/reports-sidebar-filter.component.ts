import { Component, OnDestroy } from '@angular/core';

@Component({
  selector: 'mm-reports-sidebar-filter',
  templateUrl: './reports-sidebar-filter.component.html'
})
export class ReportsSidebarFilterComponent implements OnDestroy {
  isFilterOpen = false;
  disableFilter = false;
  titleKey = 'Filter'; // Todo
  submitButtonKey = 'Apply'; // Todo
  isMobile = false; // Todo

  constructor() { }

  openSidebarFilter() {
    this.isFilterOpen = true;
  }

  closeSidebarFilter() {
    this.isFilterOpen = false;
  }

  applyFilters() {

  }

  clearSingleFilter(filter) {
    console.warn('clearSingleFilter', filter);
  }

  ngOnDestroy() {

  }

}
