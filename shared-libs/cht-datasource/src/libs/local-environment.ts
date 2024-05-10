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

const initFeed = (medicDb: PouchDB.Database<Doc>) => medicDb.changes({ since: 'now', live: true })
  .on('change', async (change) => {
    if (change.id === SETTINGS_DOC_ID) {
      settings = await getSettingsDoc(medicDb);
    }
  });

export interface LocalEnvironment {
  medicDb: PouchDB.Database<Doc>;
  getSettings: () => Doc;
}

export default async function(sourceDatabases?: SourceDatabases): Promise<Nullable<LocalEnvironment>> {
  if (!sourceDatabases) {
    return null;
  }
  if (!settings) {
    await initFeed(sourceDatabases.medic);
    settings = await getSettingsDoc(sourceDatabases.medic);
  }
  return {
    medicDb: sourceDatabases.medic,
    getSettings: (): Doc => settings!,
  };
}
