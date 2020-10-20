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
  private routeSnapshot;

  cancelCallback;
  title;

  constructor(
    private store: Store,
    private route:ActivatedRoute,
    private router:Router,
  ) {
    this.globalActions = new GlobalActions(store);
    this.routeSnapshot = this.route.snapshot;
  }

  ngOnInit(): void {
    const stateSubscription = combineLatest(
      this.store.select(Selectors.getCancelCallback),
      this.store.select(Selectors.getTitle),
      //this.store.select(Selectors.getEnketoSavingStatus),
    ).subscribe(([
      cancelCallback,
      title,
    ]) => {
      this.cancelCallback = cancelCallback;
      this.title = title;
    });
    this.subscription.add(stateSubscription);

    const routeSubscription =  this.route.url.subscribe(() => {
      this.routeSnapshot = this.route.snapshot;
    });
    const routeParamsSubscription =  this.route.params.subscribe(() => {
      this.routeSnapshot = this.route.snapshot;
    });

    this.subscription.add(routeSubscription);
    this.subscription.add(routeParamsSubscription);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  /**
  * Navigate back to the previous view
  */
  navigateBack() {
    if (this.routeSnapshot.data.name === 'contacts.deceased') {
      // todo check if this works when we have migrated the contacts tabs
      return this.router.navigate(['contacts', this.routeSnapshot.params.id]);
    }

    if (this.routeSnapshot.params.id) {
      return this.router.navigate([this.routeSnapshot.parent.routeConfig.path]);
    }

    this.globalActions.unsetSelected();
  }

  navigationCancel() {
    // todo
    // this.globalActions.navigationCancel();
  }
}
