import { LocalDataContext, SettingsService } from './libs/data-context';
import { fetchAndFilter, getDocById, getDocsByIds, queryDocsByKey, queryDocsByRange } from './libs/doc';
import { ContactTypeQualifier, FreetextQualifier, UuidQualifier } from '../qualifier';
import * as ContactType from '../contact-types';
import { deepCopy, isNonEmptyArray, Nullable, Page } from '../libs/core';
import { Doc } from '../libs/doc';
import logger from '@medic/logger';
import contactTypeUtils from '@medic/contact-types-utils';
import { getLineageDocsById, getPrimaryContactIds, hydrateLineage, hydratePrimaryContact } from './libs/lineage';
import { InvalidArgumentError } from '../libs/error';
import { validateCursor } from './libs/core';

/** @internal */
export namespace v1 {
  const END_OF_ALPHABET = '\ufff0';
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

      const contactTypesIds = getContactTypes(settings);
      if (!contactTypesIds.includes(doc.type as string)) {
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
    const getMedicDocsById = getDocsByIds(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<ContactType.v1.Contact>> => {
      const [contact, ...lineageContacts] = await getLineageDocs(identifier.uuid);
      if (!isContact(settings)(contact, identifier.uuid)) {
        return null;
      }

      if (!isNonEmptyArray(lineageContacts)) {
        logger.debug(`No lineage places found for person [${identifier.uuid}].`);
        return contact;
      }

      const contactUuids = getPrimaryContactIds(lineageContacts).filter((uuid) => uuid !== identifier.uuid);
      const contacts = [contact, ...(await getMedicDocsById(contactUuids))];
      const lineageContactsWithContact = lineageContacts.map(hydratePrimaryContact(contacts));
      const contactWithLineage = hydrateLineage(contact, lineageContactsWithContact);
      return deepCopy(contactWithLineage);
    };
  };

  /** @internal */
  export const getPage = ({ medicDb, settings }: LocalDataContext) => {
    // Define query functions
    const getContactsByTypeFreetext = queryDocsByKey(medicDb, 'medic-client/contacts_by_type_freetext');
    const getContactsByFreetext = queryDocsByKey(medicDb, 'medic-client/contacts_by_freetext');
    const getContactsByType = queryDocsByKey(medicDb, 'medic-client/contacts_by_type');
    const getContactsByTypeFreetextRange = queryDocsByRange(medicDb, 'medic-client/contacts_by_type_freetext');
    const getContactsByFreetextRange = queryDocsByRange(medicDb, 'medic-client/contacts_by_freetext');

    const determineGetDocsFn = (
      qualifier: ContactTypeQualifier | FreetextQualifier
    ): ((limit: number, skip: number) => Promise<Nullable<Doc>[]>) | null => {
      if (isContactTypeAndFreetextType(qualifier)) {
        return getDocsFnForContactTypeAndFreetext(qualifier);
      }

      if (ContactType.v1.isContactType(qualifier)) {
        return getDocsFnForContactType(qualifier);
      }

      if (ContactType.v1.isFreetextType(qualifier)) {
        return getDocsFnForFreetextType(qualifier);
      }

      return null;
    };

    const isContactTypeAndFreetextType = (
      qualifier: ContactTypeQualifier | FreetextQualifier
    ): qualifier is ContactTypeQualifier & FreetextQualifier => {
      return ContactType.v1.isContactType(qualifier) && ContactType.v1.isFreetextType(qualifier);
    };

    const getDocsFnForContactTypeAndFreetext = (
      qualifier: ContactTypeQualifier & FreetextQualifier
    ): (limit: number, skip: number) => Promise<Nullable<Doc>[]> => {
      if (qualifier.freetext.includes(':')) {
        return (limit, skip) => getContactsByTypeFreetext(
          [qualifier.contactType, qualifier.freetext],
          limit,
          skip
        );
      }

      return (limit, skip) => getContactsByTypeFreetextRange(
        [qualifier.contactType, qualifier.freetext],
        [qualifier.contactType, qualifier.freetext + END_OF_ALPHABET],
        limit,
        skip
      );
    };

    const getDocsFnForContactType = (
      qualifier: ContactTypeQualifier
    ): (limit: number, skip: number) => Promise<Nullable<Doc>[]> => (
      limit,
      skip
    ) => getContactsByType([qualifier.contactType], limit, skip);

    const getDocsFnForFreetextType = (
      qualifier: FreetextQualifier
    ): (limit: number, skip: number) => Promise<Nullable<Doc>[]> => {
      if (qualifier.freetext.includes(':')) {
        return (limit, skip) => getContactsByFreetext([qualifier.freetext], limit, skip);
      }
      return (limit, skip) => getContactsByFreetextRange(
        [qualifier.freetext],
        [qualifier.freetext + END_OF_ALPHABET],
        limit,
        skip
      );
    };

    return async (
      qualifier: ContactTypeQualifier | FreetextQualifier,
      cursor: Nullable<string>,
      limit: number
    ): Promise<Page<string>> => {
      const skip = validateCursor(cursor);

      const getDocsFn = determineGetDocsFn(qualifier);
      if (!getDocsFn) {
        throw new InvalidArgumentError(`Unsupported qualifier type: ${JSON.stringify(qualifier)}`);
      }

      const pagedDocs = await fetchAndFilter(getDocsFn, isContact(settings), limit)(limit, skip);

      return {
        data: pagedDocs.data.map((doc) => doc._id),
        cursor: pagedDocs.cursor,
      } as Page<string>;
    };
  };
}
