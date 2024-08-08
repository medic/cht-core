import { Doc } from '../libs/doc';
import contactTypeUtils from '@medic/contact-types-utils';
import { deepCopy, isNonEmptyArray, Nullable, Page } from '../libs/core';
import { ContactTypeQualifier, UuidQualifier } from '../qualifier';
import * as Person from '../person';
import { getDocById, getDocsByIds, queryDocsByKey } from './libs/doc';
import { LocalDataContext, SettingsService } from './libs/data-context';
import logger from '@medic/logger';
import { getLineageDocsById, getPrimaryContactIds, hydrateLineage, hydratePrimaryContact } from './libs/lineage';
import {InvalidArgumentError} from '../libs/error';

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
      cursor: string,
      limit: number,
    ): Promise<Page<Person.v1.Person>> => {
      const personTypes = contactTypeUtils.getPersonTypes(settings.getAll());
      const personTypesIds = personTypes.map((item) => item.id);

      if (!personTypesIds.includes(personType.contactType)) {
        throw new InvalidArgumentError(`Invalid contact type [${personType.contactType}]`);
      }

      // Adding a number skip variable here so as not to confuse ourselves
      const skip = Number(cursor) || 0;
      const getDocsByPage = queryDocsByKey(medicDb, 'medic-client/contacts_by_type');

      const fetchAndFilter = async (
        currentLimit: number,
        currentSkip: number,
        currentPersonDocs: Person.v1.Person[] = [],
      ): Promise<Page<Person.v1.Person>> => {
        const docs = await getDocsByPage([personType.contactType], currentLimit, currentSkip);
        const noMoreResults = docs.length < currentLimit;
        const newPersonDocs = docs.filter((doc): doc is Person.v1.Person => isPerson(settings, doc, doc?._id));
        const overFetchCount = currentPersonDocs.length + newPersonDocs.length - limit || 0;
        const totalPeople = [...currentPersonDocs, ...newPersonDocs].slice(0, limit);

        if (noMoreResults) {
          return { data: totalPeople, cursor: '-1' };
        }

        if (totalPeople.length === limit) {
          const nextSkip = currentSkip + currentLimit - overFetchCount;

          return { data: totalPeople, cursor: nextSkip.toString() };
        }

        // Re-fetch twice as many docs as we need to limit number of recursions
        const missingCount = currentLimit - newPersonDocs.length;
        logger.debug(`Found [${missingCount.toString()}] invalid persons. Re-fetching additional records.`);
        const nextLimit = missingCount * 2;
        const nextSkip = currentSkip + currentLimit;

        return fetchAndFilter(
          nextLimit,
          nextSkip,
          totalPeople,
        );
      };

      return fetchAndFilter(limit, skip);
    };
  };
}
