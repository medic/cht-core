import { Component, OnInit } from '@angular/core';
import { NewRole, Role, RolesMap, RoleValidation } from '../authorization-interfaces';
import { ResponseStatus } from '../../global-modules-interfaces';
import { SettingsService } from '@admin-tool-services/settings.service';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslateService } from '@ngx-translate/core';

/**
 * Component for managing the roles configured in the CHT instance.
 *
 * Loads settings.roles on init and displays them in a table.
 * Allows administrators to add new roles and delete existing ones.
 *
 * Part of the Authorization module — requires the can_configure permission.
 */
@Component({
  selector: 'authorization-roles',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './authorization-roles.component.html',
  styleUrl: './authorization-roles.component.less',
})
export class AuthorizationRolesComponent implements OnInit {
  /** List of roles mapped from settings.roles for template iteration */
  roles: { key: string; value: Role }[] = [];

  /** Controls visibility of the loader while settings are being fetched */
  loadingPageStatus = false;

  /** Tracks the state of save operations for add and delete actions */
  responseStatus: ResponseStatus = {};

  /** Form model for the new role being added */
  newRole: NewRole = {};

  /** Validation errors for the new role form */
  roleValidation: RoleValidation = {};

  /** Controls visibility of the inline loader during add operation */ 
  isAddingRole = false;

  constructor(private settingsService: SettingsService, private translate: TranslateService) {}

  /**
   * Fetches settings.roles on init and maps the result into an array
   * of { key, value } pairs for use in the template @for loop.
   */
  async ngOnInit(): Promise<void> {
    this.loadingPageStatus = true;

    try {
      const rolesMap = await this.settingsService.getRoles();
      this.roles = Object.entries(rolesMap).map(([key, value]) => ({ key, value }));
    } catch (error) {
      console.error('Error fetching roles', error);
    } finally {
      this.loadingPageStatus = false;
    }
  }

  /**
   * Validates the new role form fields.
   * Sets roleValidation errors if key or name are empty.
   *
   * @returns {boolean} true if the form is valid, false otherwise
   */
  private validateRole(): boolean {
    this.roleValidation = {};

    if (!this.newRole.key) {
      this.roleValidation.key = this.translate.instant('field is required', {
        field: this.translate.instant('configuration.role')
      });
    }

    if (!this.newRole.name) {
      this.roleValidation.name = this.translate.instant('field is required', {
        field: this.translate.instant('translation.key')
      });
    }

    return !Object.keys(this.roleValidation).length;
  }
  
  /**
   * Adds a new role to the settings.
   * Clones existing roles, appends the new one, and saves via updateRoles.
   * Clears the form on success and shows an error message on failure.
   *
   * @returns {Promise<void>}
   */
  async addRole(): Promise<void> {
    this.isAddingRole = true;
    this.responseStatus = {};

    if (!this.validateRole()) {
      return;
    }

    this.responseStatus = { state: 'loading' };

    const changes: RolesMap = {};
    this.roles.forEach((role) => {
      changes[role.key] = role.value;
    });

    changes[this.newRole.key!] = {
      name: this.newRole.name!,
      offline: this.newRole.offline,
    };

    try {
      await this.settingsService.updateRoles(changes);
      this.roles = Object.entries(changes).map(([key, value]) => ({ key, value }));
      this.newRole = {};
      this.responseStatus = {};
    } catch (error) {
      console.error('Error saving role', error);
      this.responseStatus = { state: 'error', msg: 'Error saving settings' };
    } finally {
      this.isAddingRole = false;
    }
  }

  /**
   * Deletes a role from the settings by its key.
   * Clones existing roles excluding the deleted key and saves via updateRoles.
   * Shows an error message on failure.
   *
   * @param {string} key - the key of the role to delete
   * @returns {Promise<void>}
   */
  async deleteRole(key: string): Promise<void> {
    this.responseStatus = { state: 'loading' };

    const changes: RolesMap = {};
    this.roles.forEach((role) => {
      if (role.key !== key) {
        changes[role.key] = role.value;
      }
    });

    try {
      await this.settingsService.updateRoles(changes);
      this.roles = Object.entries(changes).map(([key, value]) => ({ key, value }));
      this.responseStatus = {};
    } catch (error) {
      console.error('Error deleting role', error);
      this.responseStatus = { state: 'error', msg: 'Error saving settings' };
    }
  }
}
