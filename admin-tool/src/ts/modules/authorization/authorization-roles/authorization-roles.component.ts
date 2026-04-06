import { Component, OnInit } from '@angular/core';
import { Role } from '../authorization-interfaces';
import { ResponseStatus } from '../../global-modules-interfaces';
import { SettingsService } from '@admin-tool-services/settings.service';

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
  imports: [],
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

  constructor(private settingsService: SettingsService) {}

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

  //TODO
  //async addRole(): Promise<void> {}

  //TODO
  //async deleteRole(key: string): Promise<void> {}
}
