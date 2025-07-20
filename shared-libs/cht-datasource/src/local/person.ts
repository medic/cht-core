import { Doc } from '../libs/doc';
import contactTypeUtils from '@medic/contact-types-utils';
import { Nullable, Page } from '../libs/core';
import { ContactTypeQualifier, UuidQualifier } from '../qualifier';
import * as Person from '../person';
import { fetchAndFilter, getDocById, queryDocsByKey } from './libs/doc';
import { LocalDataContext, SettingsService } from './libs/data-context';
import logger from '@medic/logger';
import { InvalidArgumentError } from '../libs/error';
import { validateCursor } from './libs/core';
import { fetchHydratedDoc } from './libs/lineage';

/** @internal */
export namespace v1 {
  const isPerson = (settings: SettingsService) => (doc: Nullable<Doc>, uuid?: string): doc is Person.v1.Person => {
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
    const fetchHydratedMedicDoc = fetchHydratedDoc(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<Person.v1.PersonWithLineage>> => {
      const person = await fetchHydratedMedicDoc(identifier.uuid);
      if (!isPerson(settings)(person, identifier.uuid)) {
        return null;
      }

      return person;
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
}
