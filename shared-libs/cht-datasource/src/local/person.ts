import { Doc } from '../libs/doc';
import contactTypeUtils from '@medic/contact-types-utils';
import { hasField, isNonEmptyArray, Nullable, Page } from '../libs/core';
import { ContactTypeQualifier, PersonQualifier, UuidQualifier } from '../qualifier';
import * as Person from '../person';
import { createDoc, fetchAndFilter, getDocById, queryDocsByKey } from './libs/doc';
import { LocalDataContext, SettingsService } from './libs/data-context';
import logger from '@medic/logger';
import {
  getContactLineage,
  getLineageDocsById,
} from './libs/lineage';
import { InvalidArgumentError } from '../libs/error';
import { validateCursor } from './libs/core';

/** @internal */
export namespace v1 {
  /** @internal */
  export const isPerson = (
    settings: SettingsService
  ) => (
    doc: Nullable<Doc>,
    uuid?: string
  ): doc is Person.v1.Person => {
    if (!doc) {
      if (uuid) {
        logger.warn(`No person found for identifier [${uuid}].`);
      }
      return false;
    }
    const hasPersonType = contactTypeUtils.isPerson(settings.getAll(), doc);
    if (!hasPersonType) {
      logger.warn(`Document [${doc._id}] is not a valid person.`);
      return false;
    }
    return true;
  };

  /** @internal */
  export const get = ({ medicDb, settings }: LocalDataContext) => {
    const getMedicDocById = getDocById(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<Person.v1.Person>> => {
      const doc = await getMedicDocById(identifier.uuid);
      if (!isPerson(settings)(doc, identifier.uuid)) {
        return null;
      }
      return doc;
    };
  };

  /** @internal */
  export const getWithLineage = ({ medicDb, settings }: LocalDataContext) => {
    const getLineageDocs = getLineageDocsById(medicDb);
    const getLineage = getContactLineage(medicDb);

    return async (identifier: UuidQualifier): Promise<Nullable<Person.v1.PersonWithLineage>> => {
      const [person, ...lineagePlaces] = await getLineageDocs(identifier.uuid);
      if (!isPerson(settings)(person, identifier.uuid)) {
        return null;
      }
      // Intentionally not further validating lineage. For passivity, lineage problems should not block retrieval.
      if (!isNonEmptyArray(lineagePlaces)) {
        logger.debug(`No lineage places found for person [${identifier.uuid}].`);
        return person;
      }

      return await getLineage(lineagePlaces, person) as Nullable<Person.v1.PersonWithLineage>;
    };
  };

  /** @internal */
  export const getPage = ({ medicDb, settings }: LocalDataContext) => {
    const getDocsByPage = queryDocsByKey(medicDb, 'medic-client/contacts_by_type');

    return async (
      personType: ContactTypeQualifier,
      cursor: Nullable<string>,
      limit: number,
    ): Promise<Page<Person.v1.Person>> => {
      const personTypes = contactTypeUtils.getPersonTypes(settings.getAll());
      const personTypesIds = personTypes.map((item) => item.id);

      if (!personTypesIds.includes(personType.contactType)) {
        throw new InvalidArgumentError(`Invalid contact type [${personType.contactType}].`);
      }

      const skip = validateCursor(cursor);

      const getDocsByPageWithPersonType = (
        limit: number,
        skip: number
      ) => getDocsByPage([personType.contactType], limit, skip);

      return await fetchAndFilter(
        getDocsByPageWithPersonType,
        isPerson(settings),
        limit
      )(limit, skip) as Page<Person.v1.Person>;
    };
  };

  
  /** @internal */
  export const createPerson = ({
    medicDb,
    settings
  } : LocalDataContext) => {
    const createPersonDoc = createDoc(medicDb);
    return async (qualifier: PersonQualifier) :Promise<Person.v1.Person> => {
      if (hasField(qualifier, { name: '_rev', type: 'string', ensureTruthyValue: true })) {
        throw new InvalidArgumentError('Cannot pass `_rev` when creating a person.');
      }
    
      // This check can only be done when we have the contact_types from LocalDataContext.
      if (!contactTypeUtils.isPerson(settings.getAll(), qualifier)) {
        throw new InvalidArgumentError('Invalid contact type.');
      }
      
      return await createPersonDoc(qualifier) as Person.v1.Person;
    };
  };
}

