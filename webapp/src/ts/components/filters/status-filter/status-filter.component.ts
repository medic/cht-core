import { Component, ViewChild, Output, EventEmitter, Input } from '@angular/core';
import { Store } from '@ngrx/store';

import { GlobalActions } from '@mm-actions/global';
import {
  MultiDropdownFilterComponent,
  MultiDropdownFilter,
} from '@mm-components/filters/multi-dropdown-filter/multi-dropdown-filter.component';
import { AbstractFilter } from '@mm-components/filters/abstract-filter';
import { InlineFilter } from '@mm-components/filters/inline-filter';

@Component({
  selector: 'mm-status-filter',
  templateUrl: './status-filter.component.html'
})
export class StatusFilterComponent implements AbstractFilter {
  private globalActions;
  inlineFilter: InlineFilter;
  statuses = {
    valid: ['valid', 'invalid'],
    verified: ['unverified', 'errors', 'correct'],
  };

  allStatuses = [...this.statuses.valid, ...this.statuses.verified];

  @Input() disabled;
  @Input() inline;
  @Input() fieldId;
  @Output() search: EventEmitter<any> = new EventEmitter();

  @ViewChild(MultiDropdownFilterComponent)
  dropdownFilter = new MultiDropdownFilter(); // initialize variable to avoid change detection errors

  constructor(
    private store: Store,
  ) {
    this.globalActions = new GlobalActions(store);
    this.inlineFilter = new InlineFilter(this.applyFilter.bind(this));
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

  getFilterLabel() {
    return 'Any status';
  }

  clear() {
    if (this.disabled) {
      return;
    }

    if (this.inline) {
      this.inlineFilter.clear();
      return;
    }

    this.dropdownFilter?.clear(false);
  }

  countSelected() {
    return this.inline && this.inlineFilter?.countSelected();
  }
}
