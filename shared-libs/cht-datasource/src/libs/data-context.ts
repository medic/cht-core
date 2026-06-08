import { DataObject, hasField, isRecord } from './core';
import { isLocalDataContext, LocalDataContext } from '../local/libs/data-context';
import { assertRemoteDataContext, isRemoteDataContext, RemoteDataContext } from '../remote/libs/data-context';

/**
 * Context for interacting with the data. This may represent a local data context where data can be accessed even while
 * offline. Or it may represent a remote data context where all data operations are performed against a remote CHT
 * instance.
 */
export interface DataContext {
  /**
   * Executes the provided function with this data context as the argument.
   * @param fn the function to execute
   * @returns the result of the function
   */
  bind: <T>(fn: (ctx: DataContext) => T) => T;
}

/**
 * Service providing access to the app settings. These settings must be guaranteed to remain current for as long as the
 * service is used. Settings data returned from future calls to service methods should reflect the current state of the
 * system's settings at the time and not just the state of the settings when the service was first created.
 */
export type SettingsService = Readonly<{ getAll: () => DataObject }>;

/** @internal */
export const assertSettingsService: (settings: unknown) => asserts settings is SettingsService = (
  settings: unknown
) => {
  if (!isRecord(settings) || !hasField(settings, { name: 'getAll', type: 'function' })) {
    throw new Error(`Invalid settings service [${JSON.stringify(settings)}].`);
  }
};

const isDataContext = (context: unknown): context is DataContext => {
  return isRecord(context) && hasField(context, { name: 'bind', type: 'function' }) && 'settings' in context;
};

/** @internal */
export const assertDataContext: (context: unknown) => asserts context is DataContext = (context: unknown) => {
  if (!isDataContext(context) || !(isLocalDataContext(context) || isRemoteDataContext(context))) {
    throw new Error(`Invalid data context [${JSON.stringify(context)}].`);
  }
};

/** @internal */
export const adapt = <T>(
  context: DataContext,
  local: (c: LocalDataContext) => T,
  remote: (c: RemoteDataContext) => T
): T => {
  if (isLocalDataContext(context)) {
    return local(context);
  }
  assertRemoteDataContext(context);
  return remote(context);
};
