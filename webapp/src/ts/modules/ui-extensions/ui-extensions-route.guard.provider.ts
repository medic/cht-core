import { CanActivate, ActivatedRouteSnapshot } from '@angular/router';
import { Injectable } from '@angular/core';
import { UiExtensionsService } from '@mm-services/ui-extensions.service';

const ALLOWED_TYPES = new Set(['header_tab', 'sidebar_tab']);

@Injectable({
  providedIn: 'root'
})
export class UiExtensionsTabRouteGuardProvider implements CanActivate {
  constructor(
    private readonly uiExtensionsService: UiExtensionsService,
  ) {
  }

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
    const id = route.params['id'];
    try {
      const properties = await this.uiExtensionsService.getProperties(id);
      return ALLOWED_TYPES.has(properties.type);
    } catch {
      return false;
    }
  }
}
