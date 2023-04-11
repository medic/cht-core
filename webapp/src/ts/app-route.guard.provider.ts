import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';

import { AuthService } from '@mm-services/auth.service';

@Injectable()
export class AppRouteGuardProvider implements CanActivate {
  constructor(
    private authService:AuthService,
    private router:Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot):Observable<boolean> {
    if (!route.data || !route.data.permissions) {
      return of(true);
    }

    return from(
      this.authService.has(route.data.permissions).then((canActivate) => {
        if (!canActivate) {
          const redirectPath = route.data.redirect || ['error', '403'];
          this.router.navigate(redirectPath);
        }
        return canActivate;
      })
    );
  }
}
