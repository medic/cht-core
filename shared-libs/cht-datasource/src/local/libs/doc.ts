import { Nullable } from '../../libs/core';
import { Doc, isDoc } from '../../libs/doc';

export const getDocById = (db: PouchDB.Database<Doc>) => async (uuid: string): Promise<Nullable<Doc>> => db
  .get(uuid)
  .then(doc => isDoc(
    doc) ? doc : null)
  .catch(err => {
    if (err.status === 404) {
      return null;
    }
    throw err;
  });
