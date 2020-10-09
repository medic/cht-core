import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { GlobalActions } from '@mm-actions/global';
import { Store } from '@ngrx/store';
import { DateFilterComponent } from '@mm-components/filters/date-filter/date-filter.component';
import { FacilityFilterComponent } from '@mm-components/filters/facility-filter/facility-filter.component';
import { FormTypeFilterComponent } from '@mm-components/filters/form-type-filter/form-type-filter.component';
import { FreetextFilterComponent } from '@mm-components/filters/freetext-filter/freetext-filter.component';
import { StatusFilterComponent } from '@mm-components/filters/status-filter/status-filter.component';
import { SearchFiltersService } from '@mm-services/search-filters.service';

@Component({
  selector: 'reports-filters',
  templateUrl: './reports-filters.component.html'
})
export class ReportsFiltersComponent {
  private globalActions;

  @Input() disabled;

  constructor(
    private store: Store,
    private searchFiltersService:SearchFiltersService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  @Output() search: EventEmitter<any> = new EventEmitter();
  @Input() reset;

  @ViewChild(FormTypeFilterComponent)
  formTypeFilter:FormTypeFilterComponent;
  @ViewChild(FacilityFilterComponent)
  facilityFilter:FacilityFilterComponent;
  @ViewChild(DateFilterComponent)
  dateFilter:DateFilterComponent;
  @ViewChild(FreetextFilterComponent)
  freetextFilter:FreetextFilterComponent;
  @ViewChild(StatusFilterComponent)
  statusFilter:StatusFilterComponent;

  ngAfterViewInit() {
    this.searchFiltersService.init(this.freetextFilter);
  }

  applyFilters() {
    this.search.emit();
  }

  resetFilters() {
    this.globalActions.clearFilters();

    this.formTypeFilter?.clear();
    this.facilityFilter?.clear();
    this.dateFilter?.clear();
    this.statusFilter?.clear();
    this.freetextFilter?.clear();

    this.applyFilters();
  }
}
