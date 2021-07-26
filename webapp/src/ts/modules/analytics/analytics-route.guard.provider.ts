import { ActivatedRouteSnapshot, Router, CanActivateChild, UrlTree } from '@angular/router';
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

import { Selectors } from '@mm-selectors/index';

@Injectable()
export class AnalyticsRouteGuardProvider implements CanActivateChild {

  constructor(
    private store: Store,
    private router: Router
  ) { }

  canActivateChild(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    return this.store
      .select(Selectors.getAnalyticsModules)
      .pipe(
        filter(modules => !!modules), // Ignoring initial state and wait for analytics modules data.
        map(analyticsModules => {
          if (route.data?.tab === 'analytics' && analyticsModules?.length === 1) {
            return this.router.createUrlTree(analyticsModules[0].route);
          }

          return true;
        })
      );
  }
}
