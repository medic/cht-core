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


  constructor(private store: Store) {
    this.globalActions = new GlobalActions(store);
  }

  canDeactivate(
    component: any,
    currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState: RouterStateSnapshot,
  ) {
    let trainingCardOpen = false;

    this.store
      .select(Selectors.getTrainingCard)
      .subscribe(trainingCard => {
        trainingCardOpen = trainingCard.isOpen;
      }).unsubscribe();

    if (trainingCardOpen) {
      this.globalActions.setTrainingCard({ isOpen: true, showConfirmExit: true, nextUrl: nextState.url });
      return false;
    }

    return true;
  }
}

