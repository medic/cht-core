import { Injectable } from '@angular/core';

import { SessionService } from '@mm-services/session.service';
import { SettingsService } from '@mm-services/settings.service';
import { CHTScriptApiService } from '@mm-services/cht-script-api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private chtApi;

  constructor(
    private session: SessionService,
    private settings: SettingsService,
    private chtScriptApiService: CHTScriptApiService
  ) {
    this.chtApi = this.chtScriptApiService.getApi();
  }

  /**
   * Returns true if the current user's role has all the permissions passed in as arguments.
   * If a permission has a '!' prefix, resolves true only if the user doesn't have the permission.
   * DB admins automatically have all permissions.
   * @param permissions {string | string[]}
   */
  has(permissions?: string | string[]): Promise<boolean> {
    return this.settings
      .get()
      .then(settings => {
        const userCtx = this.session.userCtx();

        if (!userCtx) {
          console.debug('AuthService :: Not logged in.');
        }

        return this.chtApi.v1.hasPermissions(permissions, userCtx, settings);
      })
      .catch(() => false);
  }

  /**
   * Receives a list of groups of permissions and returns a promise that will be resolved if the
   * current user's role has all the permissions of any of the provided groups.
   * @param permissionsGroupList {string | string[] | string[][]}
   */
  any(permissionsGroupList?: string | string[] | string[][]): Promise<boolean> {
    // The `permissionsGroupList` is an array that contains groups of permissions,
    // mainly attributed to the complexity of permission grouping
    if (!Array.isArray(permissionsGroupList)) {
      return this.has(permissionsGroupList);
    }

    return this.settings
      .get()
      .then(settings => {
        const userCtx = this.session.userCtx();

        if (!userCtx) {
          console.debug('AuthService :: Not logged in');
        }

        return this.chtApi.v1.hasAnyPermission(permissionsGroupList, userCtx, settings);
      })
      .catch(() => false);
  }

  online(online?): boolean {
    const userCtx = this.session.userCtx();

    if (!userCtx) {
      return false;
    }

    if (this.session.isOnlineOnly(userCtx) !== Boolean(online)) {
      const reason = online ? 'user missing online role' : 'user has online role';
      console.debug(`AuthService :: ${reason}. User roles: ${userCtx.roles}`);
      return false;
    }

    return true;
  }
}
