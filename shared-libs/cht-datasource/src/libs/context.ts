import { Doc } from './doc';
import { getLocalDataContext } from '../local/libs/local-environment';

export type SourceDatabases = Readonly<{ medic: PouchDB.Database<Doc> }>;

export interface DataContext {}

export interface LocalDataContext extends DataContext {
  medicDb: PouchDB.Database<Doc>;
  settings: Doc;
}

export const isLocalDataContext = (context: DataContext): context is LocalDataContext => {
  return 'getSettings' in context && 'medicDb' in context;
}

/**
 * Returns the data context based on the source databases (if provided). If local source databases are provided, these
 * will be used to interact with the data. This functionality is intended for use cases requiring offline functionality.
 * For all other use cases, no source databases should be provided and instead the library will use the remote API to
 * interact with the data.
 * @param sourceDatabases { SourceDatabases? } the PouchDB databases to use as the local datasource. Required for offline functionality.
 * @return {Promise<DataContext>} the data context
 */
export const getDataContext = async (sourceDatabases?: SourceDatabases): Promise<DataContext> => {
  if (sourceDatabases) {
    return getLocalDataContext(sourceDatabases);
  }
  return {};
}
