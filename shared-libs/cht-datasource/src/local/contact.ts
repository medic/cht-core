import { LocalDataContext, SettingsService } from './libs/data-context';
import { fetchAndFilter, getDocById, queryDocsByKey, queryDocsByRange } from './libs/doc';
import { ContactTypeQualifier, FreetextQualifier, isKeyedFreetextQualifier, UuidQualifier } from '../qualifier';
import * as ContactType from '../contact-types';
import { isNonEmptyArray, NonEmptyArray, Nullable, Page } from '../libs/core';
import { Doc } from '../libs/doc';
import logger from '@medic/logger';
import contactTypeUtils from '@medic/contact-types-utils';
import { getContactLineage, getLineageDocsById } from './libs/lineage';
import { InvalidArgumentError } from '../libs/error';
import { normalizeFreetext, validateCursor } from './libs/core';
import { END_OF_ALPHABET_MARKER } from '../libs/constants';
import { isContactType, isContactTypeAndFreetextType } from '../libs/parameter-validators';

/** @internal */
export namespace v1 {
  const getContactTypes = (settings: SettingsService): string[] => {
    const contactTypesObjects = contactTypeUtils.getContactTypes(settings.getAll());
    return contactTypesObjects.map((item) => item.id) as string[];
  };

  const isContact =
    (settings: SettingsService) => (doc: Nullable<Doc>, uuid?: string): doc is ContactType.v1.Contact => {
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
    return async (identifier: UuidQualifier): Promise<Nullable<ContactType.v1.Contact>> => {
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

    return async (identifier: UuidQualifier): Promise<Nullable<ContactType.v1.ContactWithLineage>> => {
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
        return await getContactLineage(medicDb)(lineageContacts, contact, true);
      }

      return await getContactLineage(medicDb)(combinedContacts);
    };
  };

  /** @internal */
  export const getUuidsPage = ({ medicDb, settings }: LocalDataContext) => {
    // Define query functions
    const getByTypeExactMatchFreetext = queryDocsByKey(medicDb, 'medic-client/contacts_by_type_freetext');
    const getByExactMatchFreetext = queryDocsByKey(medicDb, 'medic-client/contacts_by_freetext');
    const getByType = queryDocsByKey(medicDb, 'medic-client/contacts_by_type');
    const getByTypeStartsWithFreetext = queryDocsByRange(medicDb, 'medic-client/contacts_by_type_freetext');
    const getByStartsWithFreetext = queryDocsByRange(medicDb, 'medic-client/contacts_by_freetext');

    const determineGetDocsFn = (
      qualifier: ContactTypeQualifier | FreetextQualifier
    ): ((limit: number, skip: number) => Promise<Nullable<Doc>[]>) => {
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
    ): (limit: number, skip: number) => Promise<Nullable<Doc>[]> => {
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
    ): (limit: number, skip: number) => Promise<Nullable<Doc>[]> => (
      limit,
      skip
    ) => getByType([qualifier.contactType], limit, skip);

    const getDocsFnForFreetextType = (
      qualifier: FreetextQualifier
    ): (limit: number, skip: number) => Promise<Nullable<Doc>[]> => {
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
        const contactTypesIds = getContactTypes(settings);
        if (!contactTypesIds.includes(qualifier.contactType)) {
          throw new InvalidArgumentError(`Invalid contact type [${qualifier.contactType}].`);
        }
      }

      const skip = validateCursor(cursor);
      const getDocsFn = determineGetDocsFn(qualifier);
      const pagedDocs = await fetchAndFilter(getDocsFn, isContact(settings), limit)(limit, skip);

      return {
        data: pagedDocs.data.map((doc) => doc._id),
        cursor: pagedDocs.cursor,
      } as Page<string>;
    };
  };
}
