import { Component, EventEmitter, OnDestroy, ChangeDetectorRef, Output } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { Selectors } from '../../../selectors';
import { combineLatest, Subscription, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { GlobalActions } from '../../../actions/global';

@Component({
  selector: 'mm-freetext-filter',
  templateUrl: './freetext-filter.component.html'
})
export class FreetextFilterComponent implements OnDestroy {
  private subscription: Subscription = new Subscription();
  private globalActions;

  inputText;
  private inputTextChanged: Subject<string> = new Subject<string>();

  selectMode;
  currentTab;
  selectedReports;

  @Output() search: EventEmitter<any> = new EventEmitter();

  constructor(
    private store: Store,
  ) {
    const subscription = combineLatest(
      this.store.pipe(select(Selectors.getCurrentTab)),
      this.store.pipe(select(Selectors.getSelectMode)),
      this.store.pipe(select(Selectors.getSelectedReports))
    ).subscribe(([
      currentTab,
      selectMode,
      selectedReports,
    ]) => {
      this.currentTab = currentTab;
      this.selectMode = selectMode;
      this.selectedReports = selectedReports;
    });
    this.subscription.add(subscription);
    this.globalActions = new GlobalActions(store);

    this
      .inputTextChanged
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => {
        this.applyFilter();
      });
  }

  onFieldChange(inputText){
    this.inputTextChanged.next(inputText);
  }

  applyFilter() {
    this.globalActions.setFilter({ search: this.inputText });
    this.search.emit();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}

