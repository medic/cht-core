import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Store } from '@ngrx/store';

import { GlobalActions } from '@mm-actions/global';
import { Filter } from '@mm-components/filters/filter';
import { NgFor } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'mm-overdue-filter',
  templateUrl: './overdue-filter.component.html',
  imports: [NgFor, TranslatePipe]
})
export class OverdueFilterComponent {
  @Input() disabled;
  @Input() fieldId;
  // eslint-disable-next-line @angular-eslint/no-output-native
  @Output() search: EventEmitter<any> = new EventEmitter();

  private readonly globalActions: GlobalActions;
  filter: Filter;

  statuses = ['overdue', 'not_overdue'];

  constructor(private readonly store: Store) {
    this.globalActions = new GlobalActions(store);
    this.filter = new Filter(this.applyFilter.bind(this));
  }

  applyFilter(selected) {
    const taskOverdue = selected.length === 1 ? selected[0] === 'overdue' : undefined;

    this.globalActions.setFilter({ taskOverdue });
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
}
