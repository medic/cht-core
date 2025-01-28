import { Injectable } from '@angular/core';
import { CanDeactivate, RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, map, take } from 'rxjs';

import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';

@Injectable({
  providedIn: 'root'
})
export class TrainingCardDeactivationGuardProvider implements CanDeactivate<any> {
  private readonly globalActions: GlobalActions;

  constructor(private readonly store: Store) {
    this.globalActions = new GlobalActions(this.store);
  }

  canDeactivate(
    component: any,
    currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState: RouterStateSnapshot,
  ): Observable<boolean> {
    return this.store
      .select(Selectors.getTrainingCard)
      .pipe(
        take(1),
        map(trainingCard => {
          if (trainingCard.isOpen) {
            this.globalActions.setTrainingCard({
              showConfirmExit: true,
              nextUrl: nextState.url
            });
            return false;
          }
          return true;
        })
      );
  }
}
