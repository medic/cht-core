import { AfterViewInit, Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';

import { GlobalActions } from '@mm-actions/global';
import { TelemetryService } from '@mm-services/telemetry.service';
import { PlaceHierarchyService } from '@mm-services/place-hierarchy.service';
import { NgClass, NgIf, NgTemplateOutlet } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelDescription,
  MatExpansionPanelHeader
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
export class TasksSidebarFilterComponent implements OnInit, AfterViewInit, OnDestroy {
  // eslint-disable-next-line @angular-eslint/no-output-native
  @Output() search: EventEmitter<any> = new EventEmitter();
  @Input() disabled;

  @ViewChild(OverdueFilterComponent) overdueFilter!: OverdueFilterComponent;
  @ViewChild(TaskTypeFilterComponent) taskTypeFilter!: TaskTypeFilterComponent;
  @ViewChild(FacilityFilterComponent) facilityFilter!: FacilityFilterComponent;

  private readonly globalActions: GlobalActions;
  private filters: FilterComponent[] = [];
  isResettingFilters = false;
  isOpen = false;
  filterCount: { total: number } & Record<string, number> = { total: 0 };
  showPlaceFilter = true;

  constructor(
    private readonly store: Store,
    private readonly telemetryService: TelemetryService,
    private readonly placeHierarchyService: PlaceHierarchyService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit() {
    this.placeHierarchyService
      .get()
      .then((hierarchy = []) => {
        this.showPlaceFilter = this.hasMultiplePlaces(hierarchy);
      })
      .catch(err => console.error('Error loading facilities for filter visibility', err));
  }

  private hasMultiplePlaces(hierarchy: any[]): boolean {
    return hierarchy.length > 1 || (hierarchy.length === 1 && hierarchy[0].children?.length > 0);
  }

  ngAfterViewInit() {
    this.initFilters();
  }

  private initFilters() {
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
    this.recordApplyTelemetry();
  }

  clearFilters(fieldIds?) {
    if (this.disabled) {
      return;
    }
    const filters = fieldIds ? this.filters.filter(filter => fieldIds.includes(filter.fieldId)) : this.filters;
    filters.forEach(filter => filter.clear());
    if (fieldIds) {
      this.recordClearTelemetry(fieldIds);
    }
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
    this.recordResetTelemetry();
  }

  toggleSidebarFilter() {
    this.isOpen = !this.isOpen;
    this.globalActions.setSidebarFilter({ isOpen: this.isOpen });
    this.recordToggleTelemetry();
  }

  private recordToggleTelemetry() {
    if (this.isOpen) {
      this.telemetryService.record('tasks:filter:open');
    } else {
      this.telemetryService.record('tasks:filter:close');
    }
  }

  private recordApplyTelemetry() {
    this.telemetryService.record('tasks:filter:apply', this.filterCount.total);
    this.filters.forEach(filter => {
      const count = this.filterCount[filter.fieldId] || 0;
      if (count > 0) {
        this.telemetryService.record(`tasks:filter:apply:${filter.fieldId}`, count);
      }
    });
  }

  private recordResetTelemetry() {
    this.telemetryService.record('tasks:filter:reset');
  }

  private recordClearTelemetry(fieldIds: string[]) {
    fieldIds.forEach(fieldId => this.telemetryService.record(`tasks:filter:clear:${fieldId}`));
  }

  ngOnDestroy() {
    this.globalActions.clearSidebarFilter();
    this.globalActions.clearFilters();
  }
}
