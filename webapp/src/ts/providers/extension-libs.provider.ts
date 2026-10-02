import * as extensionLibs from '@medic/extension-libs';

import { DbService } from '@mm-services/db.service';

export const loadExtensionLibs = (dbService: DbService) => async () => {
  try {
    await extensionLibs.load(dbService.get());
  } catch (err) {
    console.error('Error loading extension libs - starting up anyway', err);
  }
};
