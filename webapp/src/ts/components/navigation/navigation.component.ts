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

  constructor(
    private store: Store,
    private route:ActivatedRoute,
    private router:Router,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit(): void {
    const subscription = combineLatest(
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
    this.subscription.add(subscription);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  /**
  * Navigate back to the previous view
  */
  navigateBack() {
    const routeSnapshot = this.route.snapshot;

    if (routeSnapshot.data.name === 'contacts.deceased') {
      // todo check if this works when we have migrated the contacts tabs
      return this.router.navigate(['contacts', routeSnapshot.params.id]);
    }

    if (routeSnapshot.params.id) {
      return this.router.navigate([routeSnapshot.parent.routeConfig.path]);
    }

    if (routeSnapshot.firstChild.params.id) {
      return this.router.navigate([routeSnapshot.routeConfig.path]);
    }

    this.globalActions.unsetSelected();
  }

  navigationCancel() {
    // todo
    // this.globalActions.navigationCancel();
  }
}
