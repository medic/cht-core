/**
 * Represents a single role as stored in settings.roles.
 * The key is the role identifier (e.g. 'chw'), the value holds display info.
 */
export interface Role {
  name: string;
  offline?: boolean;
}

/**
 * The full roles map as returned by the API.
 * The key is the role identifier, the value is the role object.
 *
 * Example:
 * {
 *   chw: { name: 'usertype.chw', offline: true },
 *   national_admin: { name: 'usertype.national_admin' }
 * }
 */
export type RolesMap = Record<string, Role>;

/**
 * Form model for adding a new role.
 * All fields are optional because the form starts empty.
 */
export interface NewRole {
  key?: string;
  name?: string;
  offline?: boolean;
}

/**
 * Validation errors for the new role form.
 * Each field maps to an error message string when invalid.
 */
export interface RoleValidation {
  key?: string;
  name?: string;
}

/**
 * The full permissions map as stored in settings.permissions.
 * The key is the permission identifier, the value is an array of role keys
 * that have that permission.
 *
 * Example:
 * {
 *   can_configure: ['national_admin', 'program_officer'],
 *   can_edit: ['chw', 'national_admin']
 * }
 */
export type PermissionsMap = Record<string, string[]>;

/**
 * Represents a single role entry in the permissions table UI.
 * Combines the role key with its translation key and enabled state
 * for a specific permission.
 */
export interface PermissionRole {
  key: string;
  name: string;
  enabled: boolean;
}

/**
 * Represents a single row in the permissions table.
 * Each permission maps to an ordered list of roles with their enabled state.
 * The list order matches the roles defined in settings.roles.
 */
export interface PermissionRow {
  key: string;
  roles: PermissionRole[];
}

