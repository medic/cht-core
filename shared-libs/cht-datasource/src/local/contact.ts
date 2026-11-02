import { LocalDataContext, SettingsService } from './libs/data-context';
import {
  fetchAndFilter,
  fetchAndFilterIds,
  getDocById,
  getDocsByIds,
  queryDocIdsByKey,
  queryDocIdsByRange,
  queryDocsByKey,
  queryDocsByKeys
} from './libs/doc';
import {
  ContactTypeQualifier,
  ExternalRefsQualifier,
  FreetextQualifier,
  IdsQualifier,
  isContactTypeQualifier,
  isFreetextQualifier,
  isIdsQualifier,
  isKeyedFreetextQualifier,
  isPhonesQualifier,
  isShortcodesQualifier,
  PhonesQualifier,
  ShortcodesQualifier,
  UuidQualifier
} from '../qualifier';
import * as Contact from '../contact';
import { DataObject, Nullable, Page } from '../libs/core';
import { Doc, isDoc } from '../libs/doc';
import logger from '@medic/logger';
import contactTypeUtils from '@medic/contact-types-utils';
import { InvalidArgumentError } from '../libs/error';
import { normalizeFreetextQualifier, validateCursor } from './libs/core';
import { END_OF_ALPHABET_MARKER } from '../libs/constants';
import { fetchHydratedDoc } from './libs/lineage';
import { queryByFreetext, useNouveauIndexes } from './libs/nouveau';
import { summariseContact } from '@medic/summaries';
import { ContactKeysQualifier, isContactKeysQualifier } from '../libs/parameter-validators';

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

// The view emits the raw `doc.phone` as a scalar key, so each number is a key on its own. Duplicates are
// dropped in a stable order, since rows come back grouped in the order the keys are supplied.
const phoneViewKeys = (qualifier: PhonesQualifier): string[] => [...new Set(qualifier.phones)];

// The view emits `['shortcode', place_id]`, `['shortcode', patient_id]` and `['external', RC_CODE]`. The qualifier
// is trusted to already hold the view's form of each value, so the keys are built as-is.
const referenceViewKeys = (qualifier: ShortcodesQualifier | ExternalRefsQualifier): [string, string][] => {
  if (isShortcodesQualifier(qualifier)) {
    return [...new Set(qualifier.shortcodes)].map(shortcode => ['shortcode', shortcode]);
  }
  return [...new Set(qualifier.externalRefs)].map(ref => ['external', ref]);
};

// The keyed views emit docs that are not contacts (any doc with a `phone`, `national_office` docs, contacts of an
// unconfigured type), so their rows are always filtered through `isContact`.
const getContactKeysDocsPageFn = (medicDb: PouchDB.Database<Doc>) => {
  const queryDocsByPhones = queryDocsByKeys(medicDb, 'medic-client/contacts_by_phone');
  const queryDocsByReference = queryDocsByKeys(medicDb, 'medic-client/contacts_by_reference');

  return (qualifier: ContactKeysQualifier) => {
    if (isPhonesQualifier(qualifier)) {
      const keys = phoneViewKeys(qualifier);
      return (limit: number, skip: number) => queryDocsByPhones(keys, limit, skip);
    }
    const keys = referenceViewKeys(qualifier);
    return (limit: number, skip: number) => queryDocsByReference(keys, limit, skip);
  };
};

const getContactDocsPageFn = (
  qualifier: ContactTypeQualifier | IdsQualifier | ContactKeysQualifier,
  getMedicDocsByIds: ReturnType<typeof getDocsByIds>,
  queryDocsByType: ReturnType<typeof queryDocsByKey>,
  getKeysPageFn: ReturnType<typeof getContactKeysDocsPageFn>,
): ((limit: number, skip: number) => Promise<Nullable<Doc>[]>) => {
  if (isIdsQualifier(qualifier)) {
    return (limit: number, skip: number) => getMedicDocsByIds(qualifier.ids.slice(skip, skip + limit));
  }
  if (isContactKeysQualifier(qualifier)) {
    return getKeysPageFn(qualifier);
  }
  return (limit: number, skip: number) => queryDocsByType([qualifier.contactType], limit, skip);
};

/** @internal */
export namespace v1 {
  /** @internal */
  export const isContact = (
    settings: SettingsService,
    doc?: Nullable<Doc>
  ): doc is Contact.v1.Contact => {
    if (!isDoc(doc)) {
      return false;
    }
    return contactTypeUtils.isContact(settings.getAll(), doc);
  };

  /** @internal */
  export const get = ({ medicDb, settings }: LocalDataContext) => {
    const getMedicDocById = getDocById(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<Contact.v1.Contact>> => {
      const doc = await getMedicDocById(identifier.uuid);
      if (!isContact(settings, doc)) {
        logger.warn(`Document [${identifier.uuid}] is not a valid contact.`);
        return null;
      }

      return doc;
    };
  };

  // A contact with both its `patient_id` and `place_id` in the supplied shortcodes is emitted twice by the
  // reference view, so ids are deduped within the page, as `fetchAndFilterIds` does.
  const getUniqueContactFilter = (settings: SettingsService) => {
    const idSet = new Set<string>();
    return (doc: Nullable<Doc>): boolean => {
      if (!isContact(settings, doc) || idSet.has(doc._id)) {
        return false;
      }
      idSet.add(doc._id);
      return true;
    };
  };

  /** @internal */
  export const getWithLineage = ({ medicDb, settings }: LocalDataContext) => {
    const fetchHydratedMedicDoc = fetchHydratedDoc(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<Contact.v1.ContactWithLineage>> => {
      const contact = await fetchHydratedMedicDoc(identifier.uuid);
      if (!isContact(settings, contact)) {
        logger.warn(`Document [${identifier.uuid}] is not a valid contact.`);
        return null;
      }

      return contact;
    };
  };

  /** @internal */
  export const getSummaries = ({ medicDb, settings }: LocalDataContext) => {
    const getMedicDocsByIds = getDocsByIds(medicDb);
    return async ({ ids }: IdsQualifier): Promise<Contact.v1.ContactSummary[]> => {
      const docs = await getMedicDocsByIds(ids);
      return docs
        .filter(doc => isContact(settings, doc))
        .map(doc => summariseContact(doc));
    };
  };

  /** @internal */
  export const getUuidsPage = ({ medicDb, settings }: LocalDataContext) => {
    const queryNouveauFreetext = queryByFreetext(medicDb, 'contacts_by_freetext');
    const queryViewByType = queryDocIdsByKey(medicDb, 'medic-client/contacts_by_type');
    const getKeysPageFn = getContactKeysDocsPageFn(medicDb);
    const getOfflineFreetextQueryPageFn = getOfflineFreetextQueryFn(medicDb);
    const promisedUseNouveau = useNouveauIndexes(medicDb);

    return async (
      qualifier: ContactTypeQualifier | FreetextQualifier | ContactKeysQualifier,
      cursor: Nullable<string>,
      limit: number
    ): Promise<Page<string>> => {
      if (isContactKeysQualifier(qualifier)) {
        // The keyed views emit docs that are not contacts, so the rows are filtered through `isContact` to
        // return the same contacts as the doc-returning path. That needs the docs, unlike the type view,
        // whose key is itself a configured contact type.
        const skip = validateCursor(cursor);
        const page = await fetchAndFilter(
          getKeysPageFn(qualifier),
          getUniqueContactFilter(settings),
          limit
        )(limit, skip);
        return { data: page.data.map(doc => doc._id), cursor: page.cursor };
      }

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

  /** @internal */
  export const getPage = ({ medicDb, settings }: LocalDataContext) => {
    const getMedicDocsByIds = getDocsByIds(medicDb);
    const queryDocsByType = queryDocsByKey(medicDb, 'medic-client/contacts_by_type');
    const getKeysPageFn = getContactKeysDocsPageFn(medicDb);

    return async (
      qualifier: ContactTypeQualifier | IdsQualifier | ContactKeysQualifier,
      cursor: Nullable<string>,
      limit: number,
    ): Promise<Page<Contact.v1.Contact>> => {
      if (isContactTypeQualifier(qualifier)) {
        assertValidContactType(settings.getAll(), qualifier);
      }

      const skip = validateCursor(cursor);
      const getPageFn = getContactDocsPageFn(qualifier, getMedicDocsByIds, queryDocsByType, getKeysPageFn);

      return await fetchAndFilter(
        getPageFn,
        getUniqueContactFilter(settings),
        limit
      )(limit, skip) as Page<Contact.v1.Contact>;
    };
  };
}
