import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';

import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';
import { NavigationService } from '@mm-services/navigation.service';

@Component({
  selector: 'mm-navigation',
  templateUrl: './navigation.component.html'
})
export class NavigationComponent implements AfterViewInit, OnDestroy {
  private subscription: Subscription = new Subscription();
  private globalActions: GlobalActions;

  isCancelCallbackSet = false;
  title = '';
  enketoSaving = false;

  constructor(
    private store: Store,
    private navigationService: NavigationService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngAfterViewInit() {
    const stateSubscription = combineLatest(
      this.store.select(Selectors.getCancelCallback),
      this.store.select(Selectors.getTitle),
      this.store.select(Selectors.getEnketoSavingStatus),
    ).subscribe(([
      cancelCallback,
      title,
      enketoSaving,
    ]) => {
      this.isCancelCallbackSet = !!cancelCallback;
      this.title = title || '';
      this.enketoSaving = enketoSaving;
    });
    this.subscription.add(stateSubscription);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  /**
   * Navigate back to the previous view
   */
  navigateBack() {
    const navigated = this.navigationService.goBack();

    if (!navigated) {
      this.globalActions.unsetSelected();
    }
  }

  navigationCancel() {
    this.globalActions.navigationCancel();
  }
}
