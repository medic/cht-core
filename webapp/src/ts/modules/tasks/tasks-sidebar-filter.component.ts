import { AfterViewInit, Component, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';

import { GlobalActions } from '@mm-actions/global';
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
import { OverdueFilterComponent } from '@mm-components/filters/overdue-filter/overdue-filter.component';
import { TaskTypeFilterComponent } from '@mm-components/filters/task-type-filter/task-type-filter.component';
import { FacilityFilterComponent } from '@mm-components/filters/facility-filter/facility-filter.component';

type FilterComponent = OverdueFilterComponent | TaskTypeFilterComponent | FacilityFilterComponent;

@Component({
  selector: 'mm-tasks-sidebar-filter',
  templateUrl: './tasks-sidebar-filter.component.html',
  imports: [
    NgClass,
    MatIcon,
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    NgTemplateOutlet,
    MatExpansionPanelDescription,
    NgIf,
    TranslatePipe,
    OverdueFilterComponent,
    TaskTypeFilterComponent,
    FacilityFilterComponent,
  ]
})
export class TasksSidebarFilterComponent implements AfterViewInit, OnDestroy {
  // eslint-disable-next-line @angular-eslint/no-output-native
  @Output() search: EventEmitter<any> = new EventEmitter();
  @Input() disabled;

  @ViewChild(OverdueFilterComponent) overdueFilter!: OverdueFilterComponent;
  @ViewChild(TaskTypeFilterComponent) taskTypeFilter!: TaskTypeFilterComponent;
  @ViewChild(FacilityFilterComponent) facilityFilter!: FacilityFilterComponent;

  private globalActions;
  private filters: FilterComponent[] = [];
  isResettingFilters = false;
  isOpen = false;
  filterCount: any = {};

  constructor(
    private store: Store,
    private telemetryService: TelemetryService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngAfterViewInit() {
    this.filters = [
      this.overdueFilter,
      this.taskTypeFilter,
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
    this.globalActions.setSidebarFilter({ filterCount: { ...this.filterCount } });
  }

  resetFilters() {
    if (this.disabled) {
      return;
    }
    this.isResettingFilters = true;
    this.globalActions.clearFilters();
    this.clearFilters();
    this.isResettingFilters = false;
    this.applyFilters();
  }

  toggleSidebarFilter() {
    this.isOpen = !this.isOpen;
    this.globalActions.setSidebarFilter({ isOpen: this.isOpen });

    if (this.isOpen) {
      this.telemetryService.record('sidebar_filter:tasks:open');
    }
  }

  ngOnDestroy() {
    this.globalActions.clearSidebarFilter();
    this.globalActions.clearFilters();
  }
}
