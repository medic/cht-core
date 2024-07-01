import { Doc } from '../libs/doc';
import contactTypeUtils from '@medic/contact-types-utils';
import { deepCopy, isNonEmptyArray, Nullable } from '../libs/core';
import { UuidQualifier } from '../qualifier';
import * as Person from '../person';
import { getDocById, getDocsByIds } from './libs/doc';
import { LocalDataContext, SettingsService } from './libs/data-context';
import logger from '@medic/logger';
import { getLineageDocsById, getPrimaryContactIds, hydrateLineage, hydratePrimaryContact } from './libs/lineage';

/** @internal */
export namespace v1 {
  const isPerson = (settings: SettingsService, uuid: string, doc: Nullable<Doc>): doc is Person.v1.Person => {
    if (!doc) {
      logger.warn(`No person found for identifier [${uuid}].`);
      return false;
    }
    const hasPersonType = contactTypeUtils.isPerson(settings.getAll(), doc);
    if (!hasPersonType) {
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
    const getMedicDocsById = getDocsByIds(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<Person.v1.PersonWithLineage>> => {
      const [person, ...lineagePlaces] = await getLineageDocs(identifier.uuid);
      if (!isPerson(settings, identifier.uuid, person)) {
        return null;
      }
      // Intentionally not further validating lineage. For passivity, lineage problems should not block retrieval.
      if (!isNonEmptyArray(lineagePlaces)) {
        logger.debug(`No lineage places found for person [${identifier.uuid}].`);
        return person;
      }

      const contactUuids = getPrimaryContactIds(lineagePlaces)
        .filter(uuid => uuid !== person._id);
      const contacts = [person, ...await getMedicDocsById(contactUuids)];
      const linagePlacesWithContact = lineagePlaces.map(hydratePrimaryContact(contacts));
      const personWithLineage = hydrateLineage(person, linagePlacesWithContact);
      return deepCopy(personWithLineage);
    };
  };
}
