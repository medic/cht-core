/*
Auth.has resolves true if the current user's role has all the permissions passed in as arguments.
If a permission has a '!' prefix, resolves true only if the user doesn't have the permission.
DB admins automatically have all permissions.

Auth.any function receives a list of groups of permissions and returns a promise that will be resolved if the current
user's role has all the permissions of any of the provided groups.
*/
import { Injectable } from '@angular/core';

import { Session } from './session.service';
import { Settings } from './settings.service';


@Injectable({
  providedIn: 'root'
})
export class Auth {
  constructor(
    private session: Session,
    private settings: Settings,
  ) {}

  has(permissions) {
    return this
      .getRoles()
      .then(roles => {
        if (!Array.isArray(permissions)) {
          permissions = [ permissions ];
        }

        const requiredPermissions = this.getRequired(permissions);
        const disallowedPermissions = this.getDisallowed(permissions);

        if (roles.includes('_admin')) {
          if (disallowedPermissions.length > 0) {
            this.logAuthFailure('disallowed permission(s) found for admin', permissions, roles);
            return Promise.resolve(false);
          }
          return Promise.resolve(true);
        }

        return this.settings.get().then(settings => {
          const error = this.permissionError(requiredPermissions, disallowedPermissions, roles, settings);
          if (error) {
            this.logAuthFailure(error, permissions, roles);
            return Promise.resolve(false);
          }

          return Promise.resolve(true);
        });
      })
      .catch(() => false)
  }

  any(permissionsList) {
    // The `permissionsList` is an array that contains groups of arrays mainly attributed
    // to the complexity of permssion grouping
    return this
      .getRoles()
      .then(roles => {
        if (!Array.isArray(permissionsList)) {
          return this.has(permissionsList);
        }

        const requiredPermissions = permissionsList.map(permissions => this.getRequired(permissions));
        const disallowedPermissions = permissionsList.map(permissions => this.getDisallowed(permissions));

        if (roles.includes('_admin')) {
          if (disallowedPermissions.every(permissions => permissions.length)) {
            this.logAuthFailure('missing required permission(s)', permissionsList, roles);
            return Promise.resolve(false);
          }

          return Promise.resolve(true);
        }

        return this.settings.get().then(settings => {
          const validPermissions = permissionsList.some((permission, i) => {
            return !this.permissionError(requiredPermissions[i], disallowedPermissions[i], roles, settings);
          });

          if (!validPermissions) {
            this.logAuthFailure('no matching permissions', permissionsList, roles);
            return Promise.resolve(false);
          }

          return Promise.resolve(true);
        });
      })
      .catch(() => false)
  };

  online(online) {
    const userCtx = this.session.userCtx();
    if (!userCtx) {
      return false;
    }

    if (this.session.isOnlineOnly(userCtx) !== Boolean(online)) {
      this.logAuthFailure(online ? 'user missing online role' : 'user has online role', [], userCtx.roles);
      return false;
    }

    return true;
  };

  private logAuthFailure(reason, permissions?, roles?) {
    console.debug(`Auth failed: ${reason}. User roles: ${roles}. Wanted permissions: ${permissions}`);
  }
  private getRoles () {
    const userCtx = this.session.userCtx();
    if (!userCtx) {
      return Promise.reject(new Error('Not logged in'));
    }

    const roles = userCtx.roles;
    if (!roles || roles.length === 0) {
      this.logAuthFailure('user has no roles');
      return Promise.reject();
    }

    return Promise.resolve(roles);
  };

  private permissionError(required, disallowed, roles, settings) {
    if (!this.check(required, roles, settings, true)) {
      return 'missing required permission(s)';
    }

    if (!this.check(disallowed, roles, settings, false)) {
      return 'found disallowed permission(s)';
    }

    return false;
  };

  private check(permissions, userRoles, settings, expected) {
    return permissions.every(permission => {
      const roles = settings.permissions[permission];
      if (!roles) {
        return !expected;
      }
      const found = userRoles.some(role => roles.includes(role));
      return expected === found;
    });
  };

  private isRequired (permission) {
    return permission.indexOf('!') !== 0;
  }
  private getRequired (permissions) {
    return permissions.filter(this.isRequired);
  }
  private getDisallowed (permissions) {
    const disallowed = permissions.filter(permission => !this.isRequired(permission));
    return disallowed.map(permission => permission.substring(1));
  };
}
