import { Doc } from '../libs/doc';
import contactTypeUtils from '@medic/contact-types-utils';
import { isNonEmptyArray, Nullable } from '../libs/core';
import { UuidQualifier } from '../qualifier';
import * as Person from '../person';
import { getDocById, getLineageDocsById } from './libs/doc';
import { LocalDataContext, SettingsService } from './libs/data-context';
import { getContactWithLineage } from './libs/contact';
import { isNormalizedParent } from '../libs/contact';
import logger from '@medic/logger';

/** @internal */
export namespace v1 {
  const isPerson = (settings: SettingsService, uuid: string, doc: Nullable<Doc>): doc is Person.v1.Person => {
    if (!doc) {
      logger.warn(`No person found for identifier [${uuid}].`);
      return false;
    }
    const hasPersonType = contactTypeUtils.isPerson(settings.getAll(), doc);
    if (!hasPersonType || !isNormalizedParent(doc)) {
      logger.warn(`Document [${uuid}] is not a valid person.`);
      return false;
    }
    return true;
  };

  /** @internal */
  export const get = ({ medicDb, settings }: LocalDataContext) => {
    const getMedicDocById = getDocById(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<Person.v1.Person>> => {
      const doc = await getMedicDocById(identifier.uuid);
      if (!isPerson(settings, identifier.uuid, doc)) {
        return null;
      }
      return doc;
    };
  };

  /** @internal */
  export const getWithLineage = ({ medicDb, settings }: LocalDataContext) => {
    const getLineageDocs = getLineageDocsById(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<Person.v1.PersonWithLineage>> => {
      const [person, ...lineagePlaces] = await getLineageDocs(identifier.uuid);
      if (!isPerson(settings, identifier.uuid, person)) {
        return null;
      }
      // Intentionally not validating lineage. For passivity, we do not want lineage problems to block retrieval.
      if (!isNonEmptyArray(lineagePlaces)) {
        return person;
      }

      return getContactWithLineage(medicDb, person, lineagePlaces);
    };
  };
}
