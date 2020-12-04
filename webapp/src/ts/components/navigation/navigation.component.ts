import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';
import { RouteSnapshotService } from '@mm-services/route-snapshot.service';

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
    private routeSnapshotService:RouteSnapshotService,
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

  /**
   * Navigate back to the previous view
   */
  navigateBack() {
    const routeSnapshot = this.routeSnapshotService.get();
    if (routeSnapshot.data.name === 'contacts.deceased') {
      // todo check if this works when we have migrated the contacts tabs
      return this.router.navigate(['/contacts', routeSnapshot.params.id]);
    }

    if (routeSnapshot.params.id) {
      const path = routeSnapshot.parent.pathFromRoot.map(route => route?.routeConfig?.path || '/');
      return this.router.navigate(path);
    }

    this.globalActions.unsetSelected();
  }

  navigationCancel() {
    this.globalActions.navigationCancel();
  }
}
