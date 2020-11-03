import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';


@Component({
  selector: 'mm-navigation',
  templateUrl: './navigation.component.html'
})
export class NavigationComponent implements OnInit, OnDestroy {
  private subscription: Subscription = new Subscription();
  private globalActions;

  cancelCallback;
  title;
  enketoSaving;

  constructor(
    private store: Store,
    private route:ActivatedRoute,
    private router:Router,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit(): void {
    const stateSubscription = combineLatest(
      this.store.select(Selectors.getCancelCallback),
      this.store.select(Selectors.getTitle),
      this.store.select(Selectors.getEnketoSavingStatus),
    ).subscribe(([
      cancelCallback,
      title,
      enketoSaving,
    ]) => {
      this.cancelCallback = cancelCallback;
      this.title = title;
      this.enketoSaving = enketoSaving;
    });
    this.subscription.add(stateSubscription);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  // todo this is duplicated code
  // merge into a provider or service!
  private getRouteSnapshot() {
    let route = this.router.routerState.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.snapshot;
  }

  /**
  * Navigate back to the previous view
  */
  navigateBack() {
    const routeSnapshot = this.getRouteSnapshot();
    if (routeSnapshot.data.name === 'contacts.deceased') {
      // todo check if this works when we have migrated the contacts tabs
      return this.router.navigate(['/contacts', routeSnapshot.params.id]);
    }

    if (routeSnapshot.params.id) {
      return this.router.navigate(['/', routeSnapshot.parent.routeConfig.path]);
    }

    this.globalActions.unsetSelected();
  }

  navigationCancel() {
    this.globalActions.navigationCancel();
  }
}
