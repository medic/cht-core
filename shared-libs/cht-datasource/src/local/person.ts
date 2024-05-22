import { Doc } from '../libs/doc';
import contactTypeUtils from '@medic/contact-types-utils';
import { Nullable } from '../libs/core';
import { UuidQualifier } from '../qualifier';
import * as Person from '../person';
import { getDocById } from './libs/doc';
import { LocalDataContext, SettingsService } from './libs/data-context';

export namespace V1 {
  /** @internal */
  const isPersonWithSettings = (settings: SettingsService) => (doc: Doc): doc is Person.V1.Person => contactTypeUtils
    .isPerson(settings.getAll(), doc);

  /** @internal */
  export const get = ({ medicDb, settings }: LocalDataContext) => {
    const getMedicDocById = getDocById(medicDb);
    const isPerson = isPersonWithSettings(settings);
    return async (identifier: UuidQualifier): Promise<Nullable<Person.V1.Person>> => {
      const doc = await getMedicDocById(identifier.uuid);
      if (!doc || !isPerson(doc)) {
        return null;
      }
      return doc;
    };
  };
}
