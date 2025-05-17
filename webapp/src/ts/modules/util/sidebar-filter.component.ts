import { AfterViewInit, Component, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';

import { GlobalActions } from '@mm-actions/global';
import { FormTypeFilterComponent } from '@mm-components/filters/form-type-filter/form-type-filter.component';
import { FacilityFilterComponent } from '@mm-components/filters/facility-filter/facility-filter.component';
import { DateFilterComponent } from '@mm-components/filters/date-filter/date-filter.component';
import { StatusFilterComponent } from '@mm-components/filters/status-filter/status-filter.component';
import { TelemetryService } from '@mm-services/telemetry.service';
import { NgClass, NgTemplateOutlet, NgIf } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelDescription
} from '@angular/material/expansion';
import { TranslatePipe } from '@ngx-translate/core';

type FilterComponent = FormTypeFilterComponent | FacilityFilterComponent | DateFilterComponent | StatusFilterComponent;

type ActiveFilters = { formType: boolean, place: boolean, date: boolean, status: boolean };

@Component({
  selector: 'mm-sidebar-filter',
  templateUrl: './sidebar-filter.component.html',
  imports: [
    NgClass,
    MatIcon,
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    NgTemplateOutlet,
    MatExpansionPanelDescription,
    FormTypeFilterComponent,
    FacilityFilterComponent,
    DateFilterComponent,
    NgIf,
    StatusFilterComponent,
    TranslatePipe
  ]
})
export class SidebarFilterComponent implements AfterViewInit, OnDestroy {
  @Output() search: EventEmitter<any> = new EventEmitter();
  @Input() disabled;
  @Input({ required: true }) type;
  @Input() includeFilters: ActiveFilters | {} = {};

  @ViewChild(FormTypeFilterComponent) formTypeFilter!: FormTypeFilterComponent;
  @ViewChild(FacilityFilterComponent) facilityFilter!: FacilityFilterComponent;
  @ViewChild('fromDate') fromDateFilter!: DateFilterComponent;
  @ViewChild('toDate') toDateFilter!: DateFilterComponent;
  @ViewChild(StatusFilterComponent) statusFilter!: StatusFilterComponent;

  private globalActions;
  private filters: FilterComponent[] = [];
  isResettingFilters = false;
  isOpen = false;
  filterCount:any = { };
  dateFilterError = '';

  readonly _defaultFilters = {
    formType: true,
    place: true,
    date: true,
    status: true
  };

  constructor(
    private store: Store,
    private telemetryService: TelemetryService,
  ) {
    this.globalActions = new GlobalActions(this.store);
  }

  get activeFilters () {
    const activeFilters : ActiveFilters = {...this._defaultFilters, ...this.includeFilters };
    return activeFilters;
  }

  ngAfterViewInit() {
    this.filters = [
      ...(this.activeFilters.formType ? [this.formTypeFilter] : []),
      ...(this.activeFilters.place ? [this.facilityFilter] : []),
      ...(this.activeFilters.date ? [this.fromDateFilter, this.toDateFilter] : []),
      ...(this.activeFilters.status ? [this.statusFilter] : [])
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
      // Counting every time the user opens the sidebar filter in relevant tab.
      this.telemetryService.record(`sidebar_filter:${this.type}:open`);
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
