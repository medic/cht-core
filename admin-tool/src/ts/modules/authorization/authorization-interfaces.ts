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
