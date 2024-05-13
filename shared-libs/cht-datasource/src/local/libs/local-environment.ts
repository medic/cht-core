import { Doc } from '../../libs/doc';
import { LocalDataContext, SourceDatabases } from '../../libs/context';
import { getDocById } from './doc';

const SETTINGS_DOC_ID = 'settings';

let settings: Doc | undefined;

const getSettingsDoc = async (medicDb: PouchDB.Database<Doc>) => {
  const settingsDoc = await getDocById(medicDb)(SETTINGS_DOC_ID);
  if (!settingsDoc) {
    throw new Error('Settings document not found.');
  }

  return settingsDoc;
};

const initFeed = (medicDb: PouchDB.Database<Doc>) => medicDb
  .changes({ since: 'now', live: true })
  .on('change', async (change) => {
    if (change.id === SETTINGS_DOC_ID) {
      settings = await getSettingsDoc(medicDb);
    }
  });

export const getLocalDataContext = async (sourceDatabases: SourceDatabases): Promise<LocalDataContext> => {
  if (!settings) {
    await initFeed(sourceDatabases.medic);
    settings = await getSettingsDoc(sourceDatabases.medic);
  }
  return {
    medicDb: sourceDatabases.medic,
    settings: settings,
  };
};
