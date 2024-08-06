import { Doc } from '../libs/doc';
import contactTypeUtils from '@medic/contact-types-utils';
import { deepCopy, isNonEmptyArray, Nullable, Page } from '../libs/core';
import { ContactTypeQualifier, UuidQualifier } from '../qualifier';
import * as Person from '../person';
import { getDocById, getDocsByIds, queryDocsByKey } from './libs/doc';
import { LocalDataContext, SettingsService } from './libs/data-context';
import logger from '@medic/logger';
import { getLineageDocsById, getPrimaryContactIds, hydrateLineage, hydratePrimaryContact } from './libs/lineage';

/** @internal */
export namespace v1 {
  const isPerson = (settings: SettingsService, doc: Nullable<Doc>, uuid = ''): doc is Person.v1.Person => {
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
      if (!isPerson(settings, doc, identifier.uuid)) {
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
      if (!isPerson(settings, person, identifier.uuid)) {
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

  /** @internal */
  export const getPage = ({ medicDb, settings }: LocalDataContext) => {
    return async (
      personType: ContactTypeQualifier,
      limit: number,
      skip: number
    ): Promise<Page<Person.v1.Person>> => {
      const personTypes = contactTypeUtils.getPersonTypes(settings.getAll());
      const personTypesIds = personTypes.map((item) => item.id);

      if (!personTypesIds.includes(personType.contactType)) {
        throw new Error(`Invalid person type: ${personType.contactType}`);
      }

      const getDocsByPage = queryDocsByKey(medicDb, 'medic-client/contacts_by_type');

      const fetchAndFilter = async (
        currentLimit: number,
        currentSkip: number,
        personDocs: Person.v1.Person[],
        totalDocsFetched = 0,
      ): Promise<Page<Person.v1.Person>> => {
        const docs = await getDocsByPage([personType.contactType], currentLimit, currentSkip);
        if (docs.length === 0) {
          return { data: personDocs, cursor: '-1' };
        }

        const tempFilteredDocs = docs.filter((doc): doc is Person.v1.Person => isPerson(settings, doc, doc?._id));

        personDocs.push(...tempFilteredDocs);
        totalDocsFetched += docs.length;

        if (personDocs.length >= limit) {
          let cursor: number;
          if (docs.length < currentLimit) {
            cursor = -1;
          } else {
            cursor = skip + totalDocsFetched - (personDocs.length - limit);
          }
          return { data: personDocs.slice(0, limit), cursor: cursor.toString() };
        }

        return fetchAndFilter(
          (currentLimit - tempFilteredDocs.length) * 2,
          currentSkip + currentLimit,
          personDocs,
          totalDocsFetched
        );
      };

      return fetchAndFilter(limit, skip, []);
    };
  };
}
