import { CanDeactivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, PRIMARY_OUTLET } from '@angular/router';
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';

import { GlobalActions } from '@mm-actions/global';
import { TasksContentComponent } from '@mm-modules/tasks/tasks-content.component';
import { TasksGroupComponent } from '@mm-modules/tasks/tasks-group.component';

@Injectable({
  providedIn: 'root'
})
export class TasksContentRouteGuardProvider implements CanDeactivate<TasksContentComponent> {
  private globalActions;
  constructor(
    private router:Router,
    private store:Store,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  canDeactivate(
    component:TasksContentComponent,
    currentRoute:ActivatedRouteSnapshot,
    currentState:RouterStateSnapshot,
    nextState:RouterStateSnapshot,
  ) {
    if (!component.enketoEdited || !component.cancelCallback) {
      return true;
    }

    this.globalActions.navigationCancel(nextState.url);
    return false;
  }
}

@Injectable({
  providedIn: 'root'
})
export class TasksGroupRouteGuardProvider implements CanDeactivate<TasksGroupComponent> {
  private globalActions;
  constructor(
    private router:Router,
    private store:Store,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  private getEmissionIdFromUrl(url) {
    const tree = this.router.parseUrl(url);
    const segments = tree.root.children[PRIMARY_OUTLET].segments;
    if (segments.length < 2 || segments[0].path !== 'tasks') {
      return;
    }

    const emissionId = segments[1].path;
    return emissionId;
  }

  canDeactivate(
    component:TasksGroupComponent,
    currentRoute:ActivatedRouteSnapshot,
    currentState:RouterStateSnapshot,
    nextState:RouterStateSnapshot,
  ) {
    if (!component.tasks || !component.cancelCallback || !component.preventNavigation) {
      return true;
    }

    const emissionId = this.getEmissionIdFromUrl(nextState.url);
    if (emissionId && component.isHouseHoldTask(emissionId)) {
      return true;
    }

    this.globalActions.navigationCancel(nextState.url);
    return false;
  }
}
