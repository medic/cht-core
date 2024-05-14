import { Doc } from './doc';

export type SourceDatabases = Readonly<{ medic: PouchDB.Database<Doc> }>;

export interface SettingsService {
  getAll: () => Doc;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataContext {}

export interface LocalDataContext extends DataContext {
  medicDb: PouchDB.Database<Doc>;
  settings: SettingsService;
}

export const isLocalDataContext = (context: DataContext): context is LocalDataContext => {
  return 'settings' in context && 'medicDb' in context;
};

/**
 * Returns the data context based on the source databases (if provided). If local source databases are provided, these
 * will be used to interact with the data. This functionality is intended for use cases requiring offline functionality.
 * For all other use cases, no source databases should be provided and instead the library will use the remote API to
 * interact with the data.
 * @param settings service that provides access to the app settings
 * @param sourceDatabases { SourceDatabases? } the PouchDB databases to use as the local datasource. Required for
 * offline functionality.
 * @return {Promise<DataContext>} the data context
 */
export const getLocalDataContext = (settings: SettingsService, sourceDatabases: SourceDatabases): DataContext => {
  return {
    medicDb: sourceDatabases.medic,
    settings
  };
};

/**
 * Returns the data context based on a remote CHT API server. This function should not be used when offline
 * functionality is required.
 * @return {Promise<DataContext>} the data context
 */
export const getRemoteDataContext = (): DataContext => {
  // TODO Need to determine what initial arguments are needed for the remote data context (e.g. session cookie...)
  return { };
};
