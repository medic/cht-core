import { isOffline, LocalDataContext, SettingsService } from './libs/data-context';
import {
  fetchAndFilterUuids,
  getDocById,
  queryDocUuidsByKey,
  queryDocUuidsByRange,
  queryNouveauIndexUuids
} from './libs/doc';
import { ContactTypeQualifier, FreetextQualifier, isKeyedFreetextQualifier, UuidQualifier } from '../qualifier';
import * as Contact from '../contact';
import { isNonEmptyArray, NonEmptyArray, Nullable, Page } from '../libs/core';
import { Doc } from '../libs/doc';
import logger from '@medic/logger';
import contactTypeUtils from '@medic/contact-types-utils';
import { getContactLineage, getLineageDocsById } from './libs/lineage';
import { InvalidArgumentError } from '../libs/error';
import { normalizeFreetext, QueryParams, validateCursor } from './libs/core';
import { END_OF_ALPHABET_MARKER } from '../libs/constants';
import { isContactType, isContactTypeAndFreetextType, isFreetextType } from '../libs/parameter-validators';

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
    const getLineageDocs = getLineageDocsById(medicDb);
    const getLineage = getContactLineage(medicDb);

    return async (identifier: UuidQualifier): Promise<Nullable<Contact.v1.ContactWithLineage>> => {
      const [contact, ...lineageContacts] = await getLineageDocs(identifier.uuid);
      if (!isContact(settings)(contact, identifier.uuid)) {
        return null;
      }

      if (!isNonEmptyArray(lineageContacts)) {
        logger.debug(`No lineage contacts found for ${contact.type} [${identifier.uuid}].`);
        return contact;
      }

      const combinedContacts: NonEmptyArray<Nullable<Doc>> = [contact, ...lineageContacts];
      
      if (contactTypeUtils.isPerson(settings.getAll(), contact)) {
        return await getLineage(lineageContacts, contact);
      }

      return await getLineage(combinedContacts);
    };
  };

  /** @internal */
  export const getUuidsPage = ({ medicDb, settings }: LocalDataContext) => {
    // Define offline query functions
    const getByTypeExactMatchFreetext = queryDocUuidsByKey(medicDb, 'medic-offline-freetext/contacts_by_type_freetext');
    const getByExactMatchFreetext = queryDocUuidsByKey(medicDb, 'medic-offline-freetext/contacts_by_freetext');
    const getByType = queryDocUuidsByKey(medicDb, 'medic-client/contacts_by_type'); // common function
    const getByTypeStartsWithFreetext = queryDocUuidsByRange(
      medicDb, 'medic-offline-freetext/contacts_by_type_freetext'
    );
    const getByStartsWithFreetext = queryDocUuidsByRange(medicDb, 'medic-offline-freetext/contacts_by_freetext');

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
          [qualifier.contactType, normalizeFreetext(qualifier.freetext)],
          limit,
          skip
        );
      }

      // this is for a begins with search
      return (limit, skip) => getByTypeStartsWithFreetext(
        [qualifier.contactType, normalizeFreetext(qualifier.freetext)],
        [qualifier.contactType, normalizeFreetext(qualifier.freetext) + END_OF_ALPHABET_MARKER],
        limit,
        skip
      );
    };

    const getDocsFnForContactType = (
      qualifier: ContactTypeQualifier
    ): (limit: number, skip: number) => Promise<string[]> => (
      limit,
      skip
    ) => getByType([qualifier.contactType], limit, skip);

    const getDocsFnForFreetextType = (
      qualifier: FreetextQualifier
    ): (limit: number, skip: number) => Promise<string[]> => {
      if (isKeyedFreetextQualifier(qualifier)) {
        return (limit, skip) => getByExactMatchFreetext([normalizeFreetext(qualifier.freetext)], limit, skip);
      }
      return (limit, skip) => getByStartsWithFreetext(
        [normalizeFreetext(qualifier.freetext)],
        [normalizeFreetext(qualifier.freetext) + END_OF_ALPHABET_MARKER],
        limit,
        skip
      );
    };
    const buildContactTypeAndFreetextParams = (
      qualifier: ContactTypeQualifier & FreetextQualifier,
      limit: number,
      cursor: Nullable<string>
    ): QueryParams => {
      // For exact match search
      if (isKeyedFreetextQualifier(qualifier)) {
        return {
          key: [qualifier.contactType, qualifier.freetext],
          limit,
          cursor
        };
      }

      // For startswith search
      return {
        startKey: [qualifier.contactType, qualifier.freetext],
        limit,
        cursor
      };
    };

    const buildFreetextParams = (
      qualifier: FreetextQualifier,
      limit: number,
      cursor: Nullable<string>
    ): QueryParams => {
      // For exact match search
      if (isKeyedFreetextQualifier(qualifier)) {
        return {
          key: [qualifier.freetext],
          limit,
          cursor
        };
      }

      // For startswith search
      return {
        startKey: [qualifier.freetext],
        limit,
        cursor
      };
    };

    const callOnlineQueryNouveauFn = (
      qualifier: ContactTypeQualifier | FreetextQualifier,
      limit: number,
      cursor: Nullable<string>
    ) => {
      let viewName = 'contacts_by_freetext';
      let params: QueryParams = { limit, cursor };

      if (isContactTypeAndFreetextType(qualifier)) {
        viewName = 'contacts_by_type_freetext';
        params = buildContactTypeAndFreetextParams(qualifier, limit, cursor);
      } else if (isFreetextType(qualifier)) {
        params = buildFreetextParams(qualifier, limit, cursor);
      }

      return queryNouveauIndexUuids(viewName)(params);
    };

    return async (
      qualifier: ContactTypeQualifier | FreetextQualifier,
      cursor: Nullable<string>,
      limit: number
    ): Promise<Page<string>> => {
      // placing this check inside the curried function because the offline state might change at runtime
      const offline = await isOffline(medicDb);

      if (isContactType(qualifier)) {
        const contactTypesIds = contactTypeUtils.getContactTypeIds(settings.getAll());
        if (!contactTypesIds.includes(qualifier.contactType)) {
          throw new InvalidArgumentError(`Invalid contact type [${qualifier.contactType}].`);
        }
      }

      // case when the system is offline and the qualifier is just a contact type
      // in case of just contact type the online-offline stuff should not kick in
      if (offline || !isFreetextType(qualifier)) {
        const getDocsFn = determineGetDocsFn(qualifier);
        const skip = validateCursor(cursor);
        return await fetchAndFilterUuids(getDocsFn, limit)(limit, skip);
      }

      return callOnlineQueryNouveauFn(qualifier, limit, cursor);
    };
  };
}
