import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { GlobalActions } from '@mm-actions/global';
import { Filter } from '@mm-components/filters/filter';
import { Selectors } from '@mm-selectors/index';
import { NgFor, NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

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

  private readonly globalActions: GlobalActions;
  private readonly subscriptions: Subscription = new Subscription();
  filter: Filter;
  taskTypes: string[] = [];

  constructor(private readonly store: Store) {
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
    const taskTypes: string[] = tasksList.map(task => task.title);
    this.taskTypes = [...new Set(taskTypes)].sort((a, b) => a.localeCompare(b));
  }

  applyFilter(selected) {
    this.globalActions.setFilter({ taskTypes: selected.length ? { selected } : undefined });
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
