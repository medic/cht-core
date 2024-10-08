import { ActivatedRouteSnapshot, CanDeactivate, RouterStateSnapshot } from '@angular/router';
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';

import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';

@Injectable({
  providedIn: 'root'
})
export class TrainingCardDeactivationGuardProvider implements CanDeactivate<any> {
  private globalActions;
  private trainingCardOpen = false;
  private formId: string | null = null;

  constructor(private store: Store) {
    this.globalActions = new GlobalActions(store);
  }

  canDeactivate(
    component: any,
    currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState: RouterStateSnapshot,
  ) {

    this.store
      .select(Selectors.getTrainingCard)
      .subscribe(trainingCard => {
        this.trainingCardOpen = trainingCard.isOpen;
        this.formId = trainingCard.formId;
      }).unsubscribe();

    if (this.trainingCardOpen) {
      this.globalActions.setTrainingCard({
        formId: this.formId,
        isOpen: true,
        showConfirmExit: true,
        nextUrl: nextState.url
      });
      return false;
    }

    return true;
  }
}

