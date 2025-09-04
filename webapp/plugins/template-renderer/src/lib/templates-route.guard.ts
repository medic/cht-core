import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';

import { context, PluginContext } from './plugin';

@Injectable({ providedIn: 'root' })
export class DynamicPermissionGuard implements CanActivate {
  private hasPerms;
  private pagePermLookup;
  constructor(
    private router:Router,
  ) {
    const ctx = context as PluginContext;
    this.hasPerms = ctx.auth.has;
    this.pagePermLookup = (pageId: string) => pageId && (ctx.config.get('pages') ?? {})?.[pageId];
  }

  canActivate(route: ActivatedRouteSnapshot):Observable<boolean> {
    return from(this.hasPermissions(route));
  }

  private hasPermissions = async (route: ActivatedRouteSnapshot): Promise<boolean> => {
    const pageId = route?.params?.['pageId'];
    const permissions: Array<string> = [];
    permissions.push(...[].concat(route?.data?.permissions ?? [], this.getPageSpecificPermissions(pageId) ?? []));

    if (permissions.length === 0) {
      return Promise.resolve(true);
    }

    return this.hasPerms(permissions).then((canActivate) => {
      if (!canActivate) {
        const redirectPath = route.data.redirect || ['error', '403'];
        this.router.navigate(redirectPath);
      }
      return canActivate;
    });
  };

  private getPageSpecificPermissions (pageId?: string) {
    const pageConfig = this.pagePermLookup?.(pageId);
    return pageConfig?.permissions;
  };
}
