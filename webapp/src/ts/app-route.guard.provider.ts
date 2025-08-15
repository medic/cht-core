import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';

import { AuthService } from '@mm-services/auth.service';
import { SettingsService } from '@mm-services/settings.service';

@Injectable()
export class AppRouteGuardProvider implements CanActivate {
  constructor(
    private router:Router,
    private authService:AuthService,
    private settingsService: SettingsService
  ) {}

  canActivate(route: ActivatedRouteSnapshot):Observable<boolean> {
    const url = (route?.url ?? []);
    const path = url.length > 0 ? url[0].path : null;
    const isCustomPage = path === 'custom';
    return from(this.hasPermissions(route, isCustomPage));
    // if (!route.data || !route.data.permissions) {
    //   return of(true);
    // }

    // return from(
    //   this.authService.has(route.data.permissions).then((canActivate) => {
    //     if (!canActivate) {
    //       const redirectPath = route.data.redirect || ['error', '403'];
    //       this.router.navigate(redirectPath);
    //     }
    //     return canActivate;
    //   })
    // );
  }

  private hasPermissions = async (route: ActivatedRouteSnapshot, isCustomPage: boolean): Promise<boolean> => {
    const permissions: Array<string> = [];
    if (isCustomPage){
      const pageId = route.paramMap.get('pageId');
      const [settings] = await Promise.all([this.settingsService.get()]);
      const customPageSettings = pageId ? settings?.pages?.[pageId] : {};
      const customPermissions = customPageSettings?.permissions;
      permissions.push(...customPermissions);
    } else {
      permissions.push(...[].concat(route?.data?.permissions ?? []));
    }

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
