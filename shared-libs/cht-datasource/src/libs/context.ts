import { Doc } from './doc';
import { hasField, isRecord } from './core';

/**
 * {@link PouchDB.Database}s to be used as the local data source.
 */
export type SourceDatabases = Readonly<{ medic: PouchDB.Database<Doc> }>;

/**
 * Service providing access to the app settings. These settings must be guaranteed to remain current for as long as the
 * service is used. Settings data returned from future calls to service methods should reflect the current state of the
 * system's settings at the time and not just the state of the settings when the service was first created.
 */
export type SettingsService = Readonly<{ getAll: () => Doc }>;

/**
 * Context for interacting with the data. This may represent a local data context where data can be accessed even while
 * offline. Or it may represent a remote data context where all data operations are performed against a remote CHT
 * instance.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataContext {}

/** @internal */
export interface LocalDataContext extends DataContext {
  medicDb: PouchDB.Database<Doc>;
  settings: SettingsService;
}

const assertSettingsService: (settings: unknown) => asserts settings is SettingsService = (settings: unknown) => {
  if (!isRecord(settings) || !hasField(settings, {name: 'getAll', type: 'function'})) {
    throw new Error(`Invalid settings service [${JSON.stringify(settings)}].`);
  }
};

const assertSourceDatabases: (sourceDatabases: unknown) => asserts sourceDatabases is SourceDatabases =
  (sourceDatabases: unknown) => {
    if (!isRecord(sourceDatabases) || !hasField(sourceDatabases, {name: 'medic', type: 'object'})) {
      throw new Error(`Invalid source databases [${JSON.stringify(sourceDatabases)}].`);
    }
  };

/** @internal */
export const assertDataContext: (context: unknown) => asserts context is DataContext = (context: unknown) => {
  if (!isRecord(context)) {
    throw new Error(`Invalid data context [${JSON.stringify(context)}].`);
  }
};

/** @internal */
export const isLocalDataContext = (context: DataContext): context is LocalDataContext => {
  return 'settings' in context && 'medicDb' in context;
};

/**
 * Returns the data context for accessing data via the provided local sources This functionality is intended for use
 * cases requiring offline functionality. For all other use cases, use {@link getRemoteDataContext}.
 * @param settings service providing access to the app settings
 * @param sourceDatabases the PouchDB databases to use as the local datasource
 * @returns the local data context
 * @throws Error if the provided settings or source databases are invalid
 */
export const getLocalDataContext = (settings: SettingsService, sourceDatabases: SourceDatabases): DataContext => {
  assertSettingsService(settings);
  assertSourceDatabases(sourceDatabases);
  return {
    medicDb: sourceDatabases.medic,
    settings
  };
};

/**
 * Returns the data context based on a remote CHT API server. This function should not be used when offline
 * functionality is required.
 * @returns the data context
 */
export const getRemoteDataContext = (): DataContext => {
  // TODO Need to determine what initial arguments are needed for the remote data context (e.g. session cookie...)
  return { };
};
