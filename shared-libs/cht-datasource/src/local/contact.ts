import { LocalDataContext, SettingsService } from './libs/data-context';
import { fetchAndFilter, getDocById, getDocsByIds, queryDocsByKey } from './libs/doc';
import { ContactTypeQualifier, FreetextQualifier, UuidQualifier } from '../qualifier';
import * as Contact from '../contact';
import { deepCopy, isNonEmptyArray, Nullable, Page } from '../libs/core';
import { Doc } from '../libs/doc';
import logger from '@medic/logger';
import contactTypeUtils from '@medic/contact-types-utils';
import { getLineageDocsById, getPrimaryContactIds, hydrateLineage, hydratePrimaryContact } from './libs/lineage';
import { InvalidArgumentError } from '../libs/error';

/** @internal */
export namespace v1 {
  const getContactTypes = (settings: SettingsService): string[] => {
    const contactTypesObjects = contactTypeUtils.getContactTypes(settings.getAll());
    return contactTypesObjects.map((item) => item.id) as string[];
  };

  const isContact =
    (settings: SettingsService) => (doc: Nullable<Doc>, uuid?: string): doc is Contact.v1.Contact => {
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
    const getMedicDocsById = getDocsByIds(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<Contact.v1.Contact>> => {
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
    // TODO: change `medic-client` to the actual ddoc later on
    const getDocsByKey = queryDocsByKey(medicDb, 'medic-client/medic-offline-freetext');

    return async (
      qualifier: ContactTypeQualifier | FreetextQualifier,
      cursor: Nullable<string>,
      limit: number
    ): Promise<Page<string>> => {
      let word = '';

      if (Contact.v1.isContactType(qualifier)) {
        word = qualifier.contactType;
      } else if (Contact.v1.isFreetextType(qualifier)) {
        word = qualifier.freetext;
      }

      // Adding a number skip variable here so as not to confuse ourselves
      const skip = Number(cursor);
      if (isNaN(skip) || skip < 0 || !Number.isInteger(skip)) {
        throw new InvalidArgumentError(`Invalid cursor token: [${String(cursor)}].`);
      }

      const getDocsFn = (limit: number, skip: number) => getDocsByKey([word], limit, skip);

      const pagedDocs = await fetchAndFilter(getDocsFn, isContact(settings), limit)(limit, skip);

      return {
        data: pagedDocs.data.map((doc) => doc._id),
        cursor: pagedDocs.cursor,
      } as Page<string>;
    };
  };
}
