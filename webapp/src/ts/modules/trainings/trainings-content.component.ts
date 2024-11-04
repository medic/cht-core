import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';

@Component({
  selector: 'training-content',
  templateUrl: './trainings-content.component.html'
})
export class TrainingsContentComponent implements OnInit, OnDestroy {

  private globalActions: GlobalActions;
  showNoSelection = false;
  showConfirmExit = false;
  subscriptions: Subscription = new Subscription();

  constructor(
    private readonly store: Store,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {
    this.globalActions = new GlobalActions(this.store);
  }

  ngOnInit() {
    this.subscribeToRouteParams();
    this.subscribeToStore();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.globalActions.clearNavigation();
  }

  private subscribeToRouteParams() {
    const routeSubscription = this.route.params.subscribe(params => {
      this.globalActions.setTrainingCard({ formId: params?.id });
      if (!params?.id) {
        this.showNoSelection = true;
        this.globalActions.setShowContent(false);
      }
    });
    this.subscriptions.add(routeSubscription);
  }

  private subscribeToStore() {
    const reduxSubscription = this.store
      .select(Selectors.getTrainingCard)
      .subscribe(trainingCard => this.showConfirmExit = trainingCard.showConfirmExit);
    this.subscriptions.add(reduxSubscription);
  }

  save() {
    this.globalActions.clearNavigation();
    return this.router.navigate([ '/', 'trainings' ]);
  }

  quit(showConfirmMessage) {
    // ToDo showConfirmMessage
    console.warn('showConfirmMessage', showConfirmMessage);
  }
}
