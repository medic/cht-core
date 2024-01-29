import { CanDeactivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';

import { GlobalActions } from '@mm-actions/global';
import { ReportsAddComponent } from '@mm-modules/reports/reports-add.component';
import { ResponsiveService } from '@mm-services/responsive.service';

@Injectable({
  providedIn: 'root'
})
export class ReportsAddDeactivationGuardProvider implements CanDeactivate<ReportsAddComponent> {
  private globalActions;

  constructor(private store: Store) {
    this.globalActions = new GlobalActions(store);
  }

  canDeactivate(
    component:ReportsAddComponent,
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
  providedIn: 'root',
})
export class ReportsSelectModelDeactivationGuardProvider implements CanDeactivate<ReportsAddComponent> {

  constructor(private responsiveService:ResponsiveService) { }

  canDeactivate(
    component:ReportsAddComponent,
    currentRoute:ActivatedRouteSnapshot,
    currentState:RouterStateSnapshot,
    nextState:RouterStateSnapshot,
  ) {
    // when in select mode, we don't want to navigate away from the "empty" report detail page to the selected report
    // detail page, but we do want to navigate to other pages
    const navigateToReportsContent = nextState?.url?.startsWith('/reports');
    const desktopSelectMode = component.selectMode && !this.responsiveService.isMobile();
    return !navigateToReportsContent || (navigateToReportsContent && !desktopSelectMode);
  }
}
