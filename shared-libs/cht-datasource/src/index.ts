/**
 * The API for interacting with the CHT data model. See the {@link Datasource} interface for details about the
 * available functionality. These APIs are guaranteed to be stable. Non-passive changes will only be released
 * in major versions of the CHT platform.
 *
 * Note that most data model functions (aside from `v1.hasPermissions` and `v1.hasAnyPermission`) are _asynchronous_
 * and should NOT be used in a _synchronous_ context (such as Tasks, Targets, Contact Summary, and Purge configuration).
 * @packageDocumentation
 */
import { hasAnyPermission, hasPermissions } from './auth';
import { assertDataContext, DataContext } from './libs/data-context';
import * as Contact from './contact';
import * as Person from './person';
import * as Place from './place';
import * as Report from './report';
import * as Target from './target';

export {
  Nullable, NonEmptyArray, Page, DataObject, DataValue, DataArray, DataPrimitive, NormalizedParent
} from './libs/core';
export { Doc } from './libs/doc';
export { DataContext, SettingsService } from './libs/data-context';
export { getLocalDataContext } from './local';
export { getRemoteDataContext } from './remote';
export { InvalidArgumentError, ResourceNotFoundError } from './libs/error';
export { SourceDatabases } from './local/libs/data-context';
export * as Contact from './contact';
export * as Person from './person';
export * as Place from './place';
export * as Qualifier from './qualifier';
export * as Input from './input';
export * as Report from './report';
export * as Target from './target';

/**
 * The CHT datasource API.
 */
export interface Datasource {
  v1: {
    /**
     * Verify if the user's role has the permission(s).
     * @param permissions permission(s) to verify
     * @param userRoles array of user roles
     * @param chtPermissionsSettings Deprecated. Optional override for the permissions config. Omit this to use
     * the current settings for the data context.
     */
    hasPermissions: (
      permissions: string | string[],
      userRoles: string[],
      chtPermissionsSettings?: Record<string, string[]>
    ) => boolean;

    /**
     * Verify if the user's role has all the permissions of any of the provided groups.
     * @param permissionsGroupList array of groups of permissions
     * @param userRoles array of user roles
     * @param chtPermissionsSettings Deprecated. Optional override for the permissions config. Omit this to use
     * the current settings for the data context.
     */
    hasAnyPermission: (
      permissionsGroupList: string[][],
      userRoles: string[],
      chtPermissionsSettings?: Record<string, string[]>
    ) => boolean;

    /** Operations for working with contacts. */
    contact: Contact.v1.Datasource;

    /** Operations for working with places. */
    place: Place.v1.Datasource;

    /** Operations for working with people. */
    person: Person.v1.Datasource;

    /** Operations for working with reports. */
    report: Report.v1.Datasource;

    /** Operations for working with targets. */
    target: Target.v1.Datasource;
  };
}

/**
 * Returns the source for CHT data.
 * @param ctx the current data context
 * @returns the CHT datasource API
 * @throws Error if the provided context is invalid
 */
export const getDatasource = (ctx: DataContext): Datasource => {
  assertDataContext(ctx);
  return {
    v1: {
      hasPermissions: (
        permissions,
        userRoles,
        chtPermissionsSettings
      ) => ctx.bind(hasPermissions)(permissions, userRoles, chtPermissionsSettings),

      hasAnyPermission: (
        permissionsGroupList,
        userRoles,
        chtPermissionsSettings
      ) => ctx.bind(hasAnyPermission)(permissionsGroupList, userRoles, chtPermissionsSettings),

      contact: Contact.v1.getDatasource(ctx),
      place: Place.v1.getDatasource(ctx),
      person: Person.v1.getDatasource(ctx),
      report: Report.v1.getDatasource(ctx),
      target: Target.v1.getDatasource(ctx),
    }
  };
};
