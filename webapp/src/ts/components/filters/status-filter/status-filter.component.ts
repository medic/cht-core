import { Component, Output, EventEmitter, Input } from '@angular/core';
import { Store } from '@ngrx/store';

import { GlobalActions } from '@mm-actions/global';
import { Filter } from '@mm-components/filters/filter';
import { NgFor } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'mm-status-filter',
  templateUrl: './status-filter.component.html',
  standalone: true,
  imports: [NgFor, TranslatePipe]
})
export class StatusFilterComponent {
  @Input() disabled;
  @Input() fieldId;
  @Output() search: EventEmitter<any> = new EventEmitter();
  private globalActions: GlobalActions;
  filter: Filter;
  statuses = {
    valid: ['valid', 'invalid'],
    verified: ['unverified', 'errors', 'correct'],
  };

  constructor(private store: Store) {
    this.globalActions = new GlobalActions(store);
    this.filter = new Filter(this.applyFilter.bind(this));
  }

  private getValidStatus(statuses) {
    const valid = statuses.includes('valid');
    const invalid = statuses.includes('invalid');

    if (valid && !invalid) {
      return true;
    }

    if (!valid && invalid) {
      return false;
    }
    // Return undefined if nothing was selected, to log telemetry properly.
    return;
  }

  private getVerifiedStatus(statuses) {
    const verified: (boolean | undefined)[] = [];
    if (statuses.includes('unverified')) {
      verified.push(undefined);
    }
    if (statuses.includes('errors')) {
      verified.push(false);
    }
    if (statuses.includes('correct')) {
      verified.push(true);
    }
    // Return undefined if nothing was selected, to log telemetry properly.
    return verified.length ? verified : undefined;
  }

  applyFilter(statuses) {
    this.globalActions.setFilter({ valid: this.getValidStatus(statuses) });
    this.globalActions.setFilter({ verified: this.getVerifiedStatus(statuses) });
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
