import { LocalDataContext, SettingsService } from './libs/data-context';
import { getDocById, getDocsByIds } from './libs/doc';
import { UuidQualifier } from '../qualifier';
import * as Contact from '../contact';
import { deepCopy, isNonEmptyArray, Nullable } from '../libs/core';
import { Doc } from '../libs/doc';
import logger from '@medic/logger';
import contactTypeUtils from '@medic/contact-types-utils';
import { getLineageDocsById, getPrimaryContactIds, hydrateLineage, hydratePrimaryContact } from './libs/lineage';

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

      const contactTypes = contactTypeUtils.getContactTypes(settings.getAll());
      const contactTypesIds = contactTypes.map((item) => item.id);
      if (!contactTypesIds.includes(doc.type)) {
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

      const contactUuids = getPrimaryContactIds(lineageContacts)
        .filter((uuid) => uuid !== identifier.uuid);
      const contacts = [contact, ...(await getMedicDocsById(contactUuids))];
      const lineageContactsWithContact = lineageContacts.map(hydratePrimaryContact(contacts));
      const contactWithLineage = hydrateLineage(contact, lineageContactsWithContact);
      return deepCopy(contactWithLineage);
    };
  };
}
