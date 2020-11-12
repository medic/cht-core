import { Component, ChangeDetectorRef, ViewChild, Output, EventEmitter, Input } from '@angular/core';
import { Store } from '@ngrx/store';

import { GlobalActions } from '@mm-actions/global';
import {
  MultiDropdownFilterComponent
} from '@mm-components/filters/multi-dropdown-filter/mullti-dropdown-filter.component';
import { AbstractFilter } from '@mm-components/filters/abstract-filter';

@Component({
  selector: 'mm-status-filter',
  templateUrl: './status-filter.component.html'
})
export class StatusFilterComponent implements AbstractFilter {
  private globalActions;

  statuses = {
    valid: ['valid', 'invalid'],
    verified: ['unverified', 'errors', 'correct'],
  };

  @Input() disabled;
  @Output() search: EventEmitter<any> = new EventEmitter();

  @ViewChild(MultiDropdownFilterComponent)
  dropdownFilter: MultiDropdownFilterComponent;

  constructor(
    private store: Store,
    private cd: ChangeDetectorRef,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngAfterViewInit() {
    // this is needed because the change detection doesn't run normally at this point, and we're using the
    // child component's methods in the view.
    this.cd.detectChanges();
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
  }

  private getVerifiedStatus(statuses) {
    const verified = [];
    if (statuses.includes('unverified')) {
      verified.push(undefined);
    }
    if (statuses.includes('errors')) {
      verified.push(false);
    }
    if (statuses.includes('correct')) {
      verified.push(true);
    }
    return verified;
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
    this.dropdownFilter?.clear(false);
  }

  allStatuses() {
    return [...this.statuses.valid, ...this.statuses.verified];
  }
}
