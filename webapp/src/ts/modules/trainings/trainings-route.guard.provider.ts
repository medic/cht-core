import { CanDeactivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Injectable } from '@angular/core';

import { TrainingsContentComponent } from '@mm-modules/trainings/trainings-content.component';

@Injectable({
  providedIn: 'root'
})
export class TrainingsRouteGuardProvider implements CanDeactivate<TrainingsContentComponent> {
  canDeactivate(
    component:TrainingsContentComponent,
    currentRoute:ActivatedRouteSnapshot,
    currentState:RouterStateSnapshot,
    nextState:RouterStateSnapshot,
  ) {
    return component.canDeactivate(nextState.url);
  }
}
