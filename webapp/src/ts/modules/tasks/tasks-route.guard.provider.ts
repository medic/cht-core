import { CanDeactivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Injectable } from '@angular/core';

import { TasksContentComponent } from '@mm-modules/tasks/tasks-content.component';
import { TasksGroupComponent } from '@mm-modules/tasks/tasks-group.component';

@Injectable({
  providedIn: 'root'
})
export class TasksContentRouteGuardProvider implements CanDeactivate<TasksContentComponent> {
  canDeactivate(
    component:TasksContentComponent,
    currentRoute:ActivatedRouteSnapshot,
    currentState:RouterStateSnapshot,
    nextState:RouterStateSnapshot,
  ) {
    return component.canDeactivate(nextState.url);
  }
}

@Injectable({
  providedIn: 'root'
})
export class TasksGroupRouteGuardProvider implements CanDeactivate<TasksGroupComponent> {
  canDeactivate(
    component:TasksGroupComponent,
    currentRoute:ActivatedRouteSnapshot,
    currentState:RouterStateSnapshot,
    nextState:RouterStateSnapshot,
  ) {
    return component.canDeactivate(nextState.url);
  }
}
