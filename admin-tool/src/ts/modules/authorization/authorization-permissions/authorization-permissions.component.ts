import { ResponseStatus } from '@admin-tool-modules/global-modules-interfaces';
import { Component, OnInit } from '@angular/core';
import { PermissionRow, PermissionsMap, RolesMap } from '../authorization-interfaces';
import { SettingsService } from '@admin-tool-services/settings.service';
import { TranslatePipe } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';

/**
 * Component for managing role permissions configured in the CHT instance.
 *
 * Loads settings.roles and settings.permissions on init and displays them
 * in a table where each row is a permission with a list of role checkboxes.
 * Allows administrators to enable or disable roles for each permission.
 *
 * Part of the Authorization module — requires the can_configure permission.
 */
@Component({
  selector: 'authorization-permissions',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './authorization-permissions.component.html',
  styleUrl: './authorization-permissions.component.less'
})
export class AuthorizationPermissionsComponent implements OnInit {

  /** List of permissions mapped from settings.permissions for template iteration */
  permissions: PermissionRow[] = [];

  /** Controls visibility of the loader while settings are being fetched */
  loadingPageStatus = false;

  /** Tracks the state of save operations for the submit action */
  responseStatus: ResponseStatus = {};

  constructor(private settingsService: SettingsService) {}

  /**
   * Fetches settings.roles and settings.permissions on init and builds
   * the permissions table model using buildPermissions.
   */
  async ngOnInit(): Promise<void> {
    this.loadingPageStatus = true;
    
    try {
      const rolesMap = await this.settingsService.getRoles();
      const permissionsMap = await this.settingsService.getPermissions();
      this.permissions = this.buildPermissions(rolesMap, permissionsMap);
    } catch (error) {
      console.error('Error fetching permissions', error);
    } finally {
      this.loadingPageStatus = false;
    }
  }

  /**
   * Builds the permissions table model from the roles and permissions maps.
   * Sorts permissions alphabetically and maps each role with its enabled state.
   *
   * @param {RolesMap} rolesMap - the full roles map from settings
   * @param {PermissionsMap} permissionsMap - the full permissions map from settings
   * @returns {PermissionRow[]}
   */
  private buildPermissions(rolesMap: RolesMap, permissionsMap: PermissionsMap): PermissionRow[] {
    const rolesKeys = Object.keys(rolesMap);
    const permissionsKeys = Object.keys(permissionsMap).sort();

    const permissionsBuilt = permissionsKeys.map( permissionKey => {
      const roles = rolesKeys.map(roleKey => ({
        key: roleKey,
        name: rolesMap[roleKey].name,
        enabled: permissionsMap[permissionKey].includes(roleKey),
      }));

      return {
        key: permissionKey,
        roles,
      };
    });
    
    return permissionsBuilt;
  }

  /**
   * Saves the updated permissions to the API.
   * Maps the UI model back to the PermissionsMap format and calls updatePermissions
   * with replace=true to overwrite the full permissions object.
   *
   * @returns {Promise<void>}
   */
  async setPermissions(){
    this.responseStatus = { state: 'loading' };
    
    const permissionsToSet: PermissionsMap = {};

    this.permissions.forEach(permission => {
      permissionsToSet[permission.key] = permission.roles
        .filter(role => role.enabled)
        .map(role => role.key);
    });
    try {
      await this.settingsService.updatePermissions(permissionsToSet);
      this.responseStatus = {};
    } catch (error) {
      console.error('Error saving permissions', error);
      this.responseStatus = { state: 'error', msg: 'Error saving settings' };
    }
  }


}
