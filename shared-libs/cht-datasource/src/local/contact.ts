import { LocalDataContext, SettingsService } from './libs/data-context';
import { fetchAndFilterIds, getDocById, queryDocIdsByKey, queryDocIdsByRange } from './libs/doc';
import {
  ContactTypeQualifier,
  FreetextQualifier,
  isContactTypeQualifier,
  isFreetextQualifier,
  isKeyedFreetextQualifier,
  UuidQualifier
} from '../qualifier';
import * as Contact from '../contact';
import { DataObject, Nullable, Page } from '../libs/core';
import { Doc } from '../libs/doc';
import logger from '@medic/logger';
import contactTypeUtils from '@medic/contact-types-utils';
import { InvalidArgumentError } from '../libs/error';
import { normalizeFreetextQualifier, validateCursor } from './libs/core';
import { END_OF_ALPHABET_MARKER } from '../libs/constants';
import { fetchHydratedDoc } from './libs/lineage';
import { queryByFreetext, useNouveauIndexes } from './libs/nouveau';

const assertValidContactType = (settings: DataObject, qualifier: ContactTypeQualifier) => {
  const contactTypesIds = contactTypeUtils.getContactTypeIds(settings);
  if (!contactTypesIds.includes(qualifier.contactType)) {
    throw new InvalidArgumentError(`Invalid contact type [${qualifier.contactType}].`);
  }
};

const getOfflineFreetextQueryFn = (medicDb: PouchDB.Database<Doc>) => {
  const queryViewFreetextByKey = queryDocIdsByKey(medicDb, 'medic-offline-freetext/contacts_by_freetext');
  const queryViewFreetextByRange = queryDocIdsByRange(medicDb, 'medic-offline-freetext/contacts_by_freetext');
  const queryViewTypeFreetextByKey = queryDocIdsByKey(medicDb, 'medic-offline-freetext/contacts_by_type_freetext');
  const queryViewTypeFreetextByRange = queryDocIdsByRange(
    medicDb, 'medic-offline-freetext/contacts_by_type_freetext'
  );

  return (qualifier: FreetextQualifier & Partial<ContactTypeQualifier>) => {
    if (isContactTypeQualifier(qualifier)) {
      if (isKeyedFreetextQualifier(qualifier)) {
        return (limit: number, skip: number) => queryViewTypeFreetextByKey(
          [qualifier.contactType, qualifier.freetext], limit, skip
        );
      }

      return (limit: number, skip: number) => queryViewTypeFreetextByRange(
        [qualifier.contactType, qualifier.freetext],
        [qualifier.contactType, qualifier.freetext + END_OF_ALPHABET_MARKER],
        limit,
        skip
      );
    }

    if (isKeyedFreetextQualifier(qualifier)) {
      return (limit: number, skip: number) => queryViewFreetextByKey([qualifier.freetext], limit, skip);
    }

    return (limit: number, skip: number) => queryViewFreetextByRange(
      [qualifier.freetext], [qualifier.freetext + END_OF_ALPHABET_MARKER], limit, skip
    );
  };
};

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
    const queryNouveauFreetext = queryByFreetext(medicDb, 'contacts_by_freetext');
    const queryViewByType = queryDocIdsByKey(medicDb, 'medic-client/contacts_by_type');
    const getOfflineFreetextQueryPageFn = getOfflineFreetextQueryFn(medicDb);
    const promisedUseNouveau = useNouveauIndexes(medicDb);

    return async (
      qualifier: ContactTypeQualifier | FreetextQualifier,
      cursor: Nullable<string>,
      limit: number
    ): Promise<Page<string>> => {
      if (isContactTypeQualifier(qualifier)) {
        assertValidContactType(settings.getAll(), qualifier);
      }

      if (!isFreetextQualifier(qualifier)) {
        // Simple contact type query
        const skip = validateCursor(cursor);
        const getPageFn = (limit: number, skip: number) => queryViewByType([qualifier.contactType], limit, skip);
        return await fetchAndFilterIds(getPageFn, limit)(limit, skip);
      }

      const freetextQualifier = normalizeFreetextQualifier(qualifier);
      if (await promisedUseNouveau) {
        // Running server-side. Use Nouveau indexes.
        return await queryNouveauFreetext(freetextQualifier, cursor, limit);
      }

      // Use client-side offline freetext views.
      const skip = validateCursor(cursor);
      const getPageFn = getOfflineFreetextQueryPageFn(freetextQualifier);
      return fetchAndFilterIds(getPageFn, limit)(limit, skip);
    };
  };
}
