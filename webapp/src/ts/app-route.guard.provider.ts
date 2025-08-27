import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';

import { AuthService } from '@mm-services/auth.service';

@Injectable()
export class AppRouteGuardProvider implements CanActivate {
  constructor(
    private router:Router,
    private authService:AuthService,
  ) {}

  canActivate(route: ActivatedRouteSnapshot):Observable<boolean> {
    return from(this.hasPermissions(route));
  }

  private hasPermissions = async (route: ActivatedRouteSnapshot): Promise<boolean> => {
    const permissions: Array<string> = [];
    permissions.push(...[].concat(route?.data?.permissions ?? []));

    if (permissions.length === 0) {
      return Promise.resolve(true);
    }

    return this.authService.has(permissions).then((canActivate) => {
      if (!canActivate) {
        const redirectPath = route.data.redirect || ['error', '403'];
        this.router.navigate(redirectPath);
      }
      return canActivate;
    });
  };
}
