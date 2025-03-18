import { isOffline, LocalDataContext, SettingsService } from './libs/data-context';
import {
  fetchAndFilterUuids,
  getDocById,
  queryDocUuidsByKey,
  queryDocUuidsByRange, queryNouveauIndex
} from './libs/doc';
import { ContactTypeQualifier, FreetextQualifier, isKeyedFreetextQualifier, UuidQualifier } from '../qualifier';
import * as Contact from '../contact';
import { isNonEmptyArray, NonEmptyArray, Nullable, Page } from '../libs/core';
import { Doc } from '../libs/doc';
import logger from '@medic/logger';
import contactTypeUtils from '@medic/contact-types-utils';
import { getContactLineage, getLineageDocsById } from './libs/lineage';
import { InvalidArgumentError } from '../libs/error';
import { normalizeFreetext, QueryByKeyParams, QueryByRangeParams, validateCursor } from './libs/core';
import { END_OF_ALPHABET_MARKER } from '../libs/constants';
import { isContactType, isContactTypeAndFreetextType } from '../libs/parameter-validators';

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
  export const getUuidsPage = ({ medicDb, settings, url }: LocalDataContext) => {
    let offline = false;
    const queryByKeys = (viewName: string) => {
      return isOffline(medicDb).then((offline_: boolean) => {
        if (offline_) {
          offline = true;
          return queryDocUuidsByKey(medicDb, `medic-offline-freetext/${viewName}`);
        }

        return queryNouveauIndex(viewName, url);
      });
    };

    const queryByRange = (
      viewName: string
    ) => {
      return isOffline(medicDb).then((offline_: boolean) => {
        if (offline_) {
          offline = true;
          return queryDocUuidsByRange(medicDb, `medic-offline-freetext/${viewName}`);
        }

        return queryNouveauIndex(viewName, url);
      });
    };

    // Define query functions
    // const getByTypeExactMatchFreetext = queryDocUuidsByKey(medicDb, 'medic-client/contacts_by_type_freetext');
    const getByTypeExactMatchFreetext = queryByKeys('contacts_by_type_freetext').then(res => res);
    const getByExactMatchFreetext = queryByKeys('contacts_by_freetext');
    const getByType = queryByKeys('contacts_by_type');
    const getByTypeStartsWithFreetext = queryByRange('contacts_by_type_freetext');
    const getByStartsWithFreetext = queryByRange('medic-client/contacts_by_freetext');

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

      const getDocsFn = determineGetDocsFn(qualifier);

      if (offline) {
        const skip = validateCursor(cursor);
        return await fetchAndFilterUuids(getDocsFn, limit)(limit, skip);
      }

      return getDocsFn();
    };
  };
}
