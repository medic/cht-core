import { Component, EventEmitter, OnDestroy, ChangeDetectorRef, Output, ViewChild } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { Selectors } from '../../../selectors';
import { combineLatest, Subscription } from 'rxjs';
import { GlobalActions } from '../../../actions/global';
import { MultiDropdownFilterComponent } from '@mm-components/multi-dropdown-filter/mullti-dropdown-filter.component';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'mm-status-filter',
  templateUrl: './status-filter.component.html'
})
export class StatusFilterComponent implements OnDestroy {
  private subscription: Subscription = new Subscription();
  private globalActions;

  statuses = {
    valid: ['valid', 'invalid'],
    verified: ['unverified', 'errors', 'correct'],
  }
  selectMode;
  selectedReports;

  @Output() search: EventEmitter<any> = new EventEmitter();
  @ViewChild(MultiDropdownFilterComponent)
  dropdownFilter: MultiDropdownFilterComponent;

  constructor(
    private store: Store,
    private cd: ChangeDetectorRef,
  ) {
    const subscription = combineLatest(
      this.store.pipe(select(Selectors.getSelectMode)),
      this.store.pipe(select(Selectors.getSelectedReports))
    ).subscribe(([
      selectMode,
      selectedReports,
    ]) => {
      this.selectMode = selectMode;
      this.selectedReports = selectedReports;
    });
    this.subscription.add(subscription);
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

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  getFilterLabel() {
    return 'Any status';
  }
}

