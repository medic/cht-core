import { LocalDataContext, SettingsService } from './libs/data-context';
import { fetchAndFilterUuids, getDocById, queryDocUuidsByKey, queryDocUuidsByRange } from './libs/doc';
import { ContactTypeQualifier, FreetextQualifier, isKeyedFreetextQualifier, UuidQualifier } from '../qualifier';
import * as Contact from '../contact';
import { Nullable, Page } from '../libs/core';
import { Doc } from '../libs/doc';
import logger from '@medic/logger';
import contactTypeUtils from '@medic/contact-types-utils';
import { InvalidArgumentError } from '../libs/error';
import { normalizeFreetext, validateCursor } from './libs/core';
import { END_OF_ALPHABET_MARKER } from '../libs/constants';
import { isContactType, isContactTypeAndFreetextType } from '../libs/parameter-validators';
import { fetchHydratedDoc } from './libs/lineage';

/** @internal */
export namespace v1 {
  const isContact =
    (settings: SettingsService) => (doc: Nullable<Doc>, uuid?: string): doc is Contact.v1.Contact => {
      if (!doc) {
        if (uuid) {
          logger.warn(`No contact found for identifier [${uuid}].`);
        }
        return false;
      }

      if (!contactTypeUtils.isContact(settings.getAll(), doc)) {
        logger.warn(`Document [${doc._id}] is not a valid contact.`);
        return false;
      }
      return true;
    };

  /** @internal */
  export const get = ({ medicDb, settings }: LocalDataContext) => {
    const getMedicDocById = getDocById(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<Contact.v1.Contact>> => {
      const doc = await getMedicDocById(identifier.uuid);
      if (!isContact(settings)(doc, identifier.uuid)) {
        return null;
      }

      return doc;
    };
  };

  /** @internal */
  export const getWithLineage = ({ medicDb, settings }: LocalDataContext) => {
    const fetchHydratedMedicDoc = fetchHydratedDoc(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<Contact.v1.ContactWithLineage>> => {
      const contact = await fetchHydratedMedicDoc(identifier.uuid);
      if (!isContact(settings)(contact, identifier.uuid)) {
        return null;
      }

      return contact;
    };
  };

  /** @internal */
  export const getUuidsPage = ({ medicDb, settings }: LocalDataContext) => {
    // Define query functions
    const getByTypeExactMatchFreetext = queryDocUuidsByKey(medicDb, 'medic-client/contacts_by_type_freetext');
    const getByExactMatchFreetext = queryDocUuidsByKey(medicDb, 'medic-client/contacts_by_freetext');
    const getByType = queryDocUuidsByKey(medicDb, 'medic-client/contacts_by_type');
    const getByTypeStartsWithFreetext = queryDocUuidsByRange(medicDb, 'medic-client/contacts_by_type_freetext');
    const getByStartsWithFreetext = queryDocUuidsByRange(medicDb, 'medic-client/contacts_by_freetext');

    const determineGetDocsFn = (
      qualifier: ContactTypeQualifier | FreetextQualifier
    ): ((limit: number, skip: number) => Promise<string[]>) => {
      if (isContactTypeAndFreetextType(qualifier)) {
        return getDocsFnForContactTypeAndFreetext(qualifier);
      }

      if (isContactType(qualifier)) {
        return getDocsFnForContactType(qualifier);
      }

      // if the qualifier is not a ContactType then, it's a FreetextType
      return getDocsFnForFreetextType(qualifier);
    };

    const getDocsFnForContactTypeAndFreetext = (
      qualifier: ContactTypeQualifier & FreetextQualifier
    ): (limit: number, skip: number) => Promise<string[]> => {
      // this is for an exact match search
      if (isKeyedFreetextQualifier(qualifier)) {
        return (limit, skip) => getByTypeExactMatchFreetext(
          [ qualifier.contactType, normalizeFreetext(qualifier.freetext) ],
          limit,
          skip
        );
      }

      // this is for a begins with search
      return (limit, skip) => getByTypeStartsWithFreetext(
        [ qualifier.contactType, normalizeFreetext(qualifier.freetext) ],
        [ qualifier.contactType, normalizeFreetext(qualifier.freetext) + END_OF_ALPHABET_MARKER ],
        limit,
        skip
      );
    };

    const getDocsFnForContactType = (
      qualifier: ContactTypeQualifier
    ): (limit: number, skip: number) => Promise<string[]> => (
      limit,
      skip
    ) => getByType([ qualifier.contactType ], limit, skip);

    const getDocsFnForFreetextType = (
      qualifier: FreetextQualifier
    ): (limit: number, skip: number) => Promise<string[]> => {
      if (isKeyedFreetextQualifier(qualifier)) {
        return (limit, skip) => getByExactMatchFreetext([ normalizeFreetext(qualifier.freetext) ], limit, skip);
      }
      return (limit, skip) => getByStartsWithFreetext(
        [ normalizeFreetext(qualifier.freetext) ],
        [ normalizeFreetext(qualifier.freetext) + END_OF_ALPHABET_MARKER ],
        limit,
        skip
      );
    };

    return async (
      qualifier: ContactTypeQualifier | FreetextQualifier,
      cursor: Nullable<string>,
      limit: number
    ): Promise<Page<string>> => {
      if (isContactType(qualifier)) {
        const contactTypesIds = contactTypeUtils.getContactTypeIds(settings.getAll());
        if (!contactTypesIds.includes(qualifier.contactType)) {
          throw new InvalidArgumentError(`Invalid contact type [${qualifier.contactType}].`);
        }
      }

      const skip = validateCursor(cursor);
      const getDocsFn = determineGetDocsFn(qualifier);

      return await fetchAndFilterUuids(getDocsFn, limit)(limit, skip);
    };
  };
}
