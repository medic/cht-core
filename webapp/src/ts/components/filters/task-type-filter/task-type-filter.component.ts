import { Component, Output, EventEmitter, Input, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { GlobalActions } from '@mm-actions/global';
import { Filter } from '@mm-components/filters/filter';
import { Selectors } from '@mm-selectors/index';
import { NgFor, NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

interface TaskType {
  id: string;
  title: string;
}

@Component({
  selector: 'mm-task-type-filter',
  templateUrl: './task-type-filter.component.html',
  imports: [NgFor, NgIf, TranslatePipe]
})
export class TaskTypeFilterComponent implements OnDestroy {
  @Input() disabled;
  @Input() fieldId;
  // eslint-disable-next-line @angular-eslint/no-output-native
  @Output() search: EventEmitter<any> = new EventEmitter();

  private globalActions: GlobalActions;
  private subscriptions: Subscription = new Subscription();
  filter: Filter;
  taskTypes: TaskType[] = [];

  constructor(private store: Store) {
    this.globalActions = new GlobalActions(store);
    this.filter = new Filter(this.applyFilter.bind(this));
    this.subscribeToStore();
  }

  private subscribeToStore() {
    const subscription = this.store
      .select(Selectors.getTasksList)
      .subscribe(tasksList => {
        this.extractTaskTypes(tasksList || []);
      });
    this.subscriptions.add(subscription);
  }

  private extractTaskTypes(tasksList) {
    const typeMap = new Map<string, TaskType>();

    tasksList.forEach(task => {
      const typeId = this.getTaskTypeId(task);
      if (typeId && !typeMap.has(typeId)) {
        typeMap.set(typeId, {
          id: typeId,
          title: task.title || typeId
        });
      }
    });

    this.taskTypes = Array.from(typeMap.values()).sort((a, b) => a.title.localeCompare(b.title));
  }

  private getTaskTypeId(task): string {
    // Use the task's resolved property or form name to identify type
    // This can be refined based on actual task structure
    return task.resolved || task.emission?.resolved || task.title || '';
  }

  applyFilter(selected) {
    let taskTypeFilter;

    if (selected.length > 0) {
      taskTypeFilter = { selected };
    }

    this.globalActions.setFilter({ taskTypes: taskTypeFilter });
    this.search.emit();
  }

  clear() {
    if (this.disabled) {
      return;
    }

    this.filter.clear();
  }

  countSelected() {
    return this.filter?.countSelected();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
