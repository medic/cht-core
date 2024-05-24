import { Doc } from '../../libs/doc';
import { AbstractDataContext, hasField, isRecord } from '../../libs/core';
import { DataContext } from '../../libs/data-context';

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

/** @internal */
export class LocalDataContext extends AbstractDataContext {
  /** @internal */
  constructor(
    readonly medicDb: PouchDB.Database<Doc>,
    readonly settings: SettingsService
  ) {
    super();
  }
}

const assertSettingsService: (settings: unknown) => asserts settings is SettingsService = (settings: unknown) => {
  if (!isRecord(settings) || !hasField(settings, { name: 'getAll', type: 'function' })) {
    throw new Error(`Invalid settings service [${JSON.stringify(settings)}].`);
  }
};

const assertSourceDatabases: (sourceDatabases: unknown) => asserts sourceDatabases is SourceDatabases =
  (sourceDatabases: unknown) => {
    if (!isRecord(sourceDatabases) || !hasField(sourceDatabases, { name: 'medic', type: 'object' })) {
      throw new Error(`Invalid source databases [${JSON.stringify(sourceDatabases)}].`);
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
  return new LocalDataContext(sourceDatabases.medic, settings);
};
