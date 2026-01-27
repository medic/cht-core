import * as Contact from '../../contact';
import * as Person from '../../person';
import {
  DataObject,
  deepCopy,
  findById,
  getLastElement,
  isIdentifiable,
  isNonEmptyArray,
  isNotNull,
  isRecord,
  isString,
  NonEmptyArray,
  NormalizedParent,
  Nullable
} from '../../libs/core';
import { Doc } from '../../libs/doc';
import { getDocsByIds, queryDocsByRange } from './doc';
import logger from '@medic/logger';
import lineageFactory from '@medic/lineage';
import * as Report from '../../report';
import * as Input from '../../input';
import * as Place from '../../place';
import { SettingsService } from './data-context';
import * as LocalContact from '../contact';
import { InvalidArgumentError } from '../../libs/error';
import contactTypeUtils from '@medic/contact-types-utils';
import { isEqual } from 'lodash';

/**
 * Returns the identified document along with the parent documents recorded for its lineage. The returned array is
 * sorted such that the identified document is the first element and the parent documents are in order of lineage.
 * @internal
 */
export const getLineageDocsById = (medicDb: PouchDB.Database<Doc>): (id: string) => Promise<Nullable<Doc>[]> => {
  const fn = queryDocsByRange(medicDb, 'medic-client/docs_by_id_lineage');
  return (id: string) => fn([id], [id, {}]);
};

/** @internal */
export const getPrimaryContactIds = (places: NonEmptyArray<Nullable<Doc>>): string[] => places
  .filter(isNotNull)
  .map(({ contact }) => contact)
  .filter(isIdentifiable)
  .map(({ _id }) => _id)
  .filter((_id) => _id.length > 0);

/** @internal */
export const hydratePrimaryContact = (contacts: Doc[]) => (place: Nullable<Doc>): Nullable<Doc> => {
  if (!place || !isIdentifiable(place.contact)) {
    return place;
  }
  const contact = findById(contacts, place.contact._id);
  if (!contact) {
    logger.debug(`No contact found with identifier [${place.contact._id}] for the place [${place._id}].`);
    return place;
  }
  return {
    ...place,
    contact
  };
};

const getParentUuid = (index: number, contact?: NormalizedParent): Nullable<string> => {
  if (!contact) {
    return null;
  }
  if (index === 0) {
    return contact._id;
  }
  return getParentUuid(index - 1, contact.parent);
};

const mergeLineage = (lineage: DataObject[], parent: DataObject): DataObject => {
  if (!isNonEmptyArray(lineage)) {
    return parent;
  }
  const child = getLastElement(lineage);
  const mergedChild = {
    ...child,
    parent: parent
  };
  return mergeLineage(lineage.slice(0, -1), mergedChild);
};

/** @internal */
export const hydrateLineage = (
  contact: Contact.v1.Contact,
  lineage: Nullable<Doc>[]
): Contact.v1.Contact => {
  const fullLineage = lineage
    .map((place, index) => {
      if (place) {
        return place;
      }
      const parentId = getParentUuid(index, contact.parent);
      // If no doc was found, just add a placeholder object with the id from the contact
      logger.debug(
        `Lineage place with identifier [${parentId ?? ''}] was not found when getting lineage for [${contact._id}].`
      );
      return { _id: parentId };
    });
  const hierarchy: NonEmptyArray<DataObject> = [contact, ...fullLineage];
  return mergeLineage(hierarchy.slice(0, -1), getLastElement(hierarchy)) as Contact.v1.Contact;
};

/** @internal */
export const getContactLineage = (medicDb: PouchDB.Database<Doc>) => {
  const getMedicDocsById = getDocsByIds(medicDb);
  const getDocs = async (uuids: string[]): Promise<Doc[]> => {
    const keys = Array
      .from(new Set(uuids))
      .filter(Boolean);
    const docs = await getMedicDocsById(keys);
    return docs.filter(d => d !== null);
  };

  return async (
    places: NonEmptyArray<Nullable<Doc>>,
    person?: Person.v1.Person,
  ): Promise<Nullable<Contact.v1.ContactWithLineage>> => {
    const primaryContactUuids = getPrimaryContactIds(places);
    const uuidsToFetch = person ? primaryContactUuids.filter(uuid => uuid !== person._id) : primaryContactUuids;
    const fetchedContacts = await getDocs(uuidsToFetch);
    const allContacts = person ? [person, ...fetchedContacts] : fetchedContacts;
    const contactsWithHydratedPrimaryContact = places.map(
      hydratePrimaryContact(allContacts)
    );

    if (person) {
      return deepCopy(hydrateLineage(
        person,
        contactsWithHydratedPrimaryContact
      ));
    }

    return deepCopy(hydrateLineage(
      contactsWithHydratedPrimaryContact[0] as Contact.v1.Contact,
      contactsWithHydratedPrimaryContact.slice(1)
    ));
  };
};

/** @internal */
export const fetchHydratedDoc = (medicDb: PouchDB.Database<Doc>): (uuid: string) => Promise<Nullable<Doc>> => {
  const { fetchHydratedDoc } = lineageFactory(Promise, medicDb);
  return async (uuid: string) => {
    try {
      return (await fetchHydratedDoc(uuid) as Doc);
    } catch (e: unknown) {
      if ((e as PouchDB.Core.Error).status === 404) {
        return null;
      }
      throw e;
    }
  };
};

/** @internal */
export const minifyDoc = (medicDb: PouchDB.Database<Doc>) => {
  const { minify } = lineageFactory(Promise, medicDb);
  return <T extends DataObject>(doc: T): T => {
    const minified = deepCopy(doc);
    minify(minified);
    return minified;
  };
};

/** @internal */
export const minifyLineage = (medicDb: PouchDB.Database<Doc>) => {
  const { minifyLineage } = lineageFactory(Promise, medicDb);
  return (doc: DataObject): NormalizedParent => minifyLineage(doc) as NormalizedParent;
};

const isSameLineage = (
  a: unknown,
  b: unknown
): boolean => {
  if (!isRecord(a) || !isRecord(b)) {
    return a === b;
  }
  if (a._id !== b._id) {
    return false;
  }
  return isSameLineage(a.parent, b.parent);
};

/** @internal*/
export const assertSameParentLineage = (a: DataObject, b: DataObject): void => {
  if (!isSameLineage(a.parent, b.parent)) {
    throw new InvalidArgumentError('Parent lineage does not match.');
  }
};

type WithUpdatableContact = Input.v1.UpdateReportInput<Report.v1.Report | Report.v1.ReportWithLineage>
  | Input.v1.UpdatePlaceInput<Place.v1.Place | Place.v1.PlaceWithLineage>;

/** @internal */
export const getContactIdForUpdate = (updated: WithUpdatableContact): string | undefined => {
  return isString(updated.contact) ? updated.contact : updated.contact?._id;
};

/**
 * Returns the `contact` value for the given updated entity. `undefined` will be returned if no value is set
 * on the updated entity for `contact`. If the `contact` value for the updated entity matches the `contact`
 * value for the original entity, this value will be returned without being validated. Otherwise, the `contact`
 * value on the updated entity will be validated and a minified version will be returned.
 * @internal
 */
export const getUpdatedContact = (
  settings: SettingsService,
  medicDb: PouchDB.Database<Doc>
) => {
  const minify = minifyLineage(medicDb);
  return (
    original: Report.v1.Report | Place.v1.Place,
    updated: WithUpdatableContact,
    contact: Nullable<Doc>
  ): NormalizedParent | undefined => {
    // Contact removed (or never set)
    if (!updated.contact) {
      return undefined;
    }

    // The contact data did not change
    if (isEqual(original.contact, updated.contact)) {
      return original.contact;
    }

    // Invalid contact data set
    if (!contact || !LocalContact.v1.isContact(settings, contact)) {
      throw new InvalidArgumentError(`No valid contact found for [${getContactIdForUpdate(updated)}].`);
    }

    // Wrong contact lineage provided on input data
    if (!isString(updated.contact) && !isSameLineage(contact, updated.contact)) {
      throw new InvalidArgumentError(
        'The given contact lineage does not match the current lineage for that contact.'
      );
    }

    return minify(contact);
  };
};

/** @internal */
export const assertHasValidParentType = (childType: Record<string, unknown>, parent: Doc): void => {
  const parentType = contactTypeUtils.getTypeId(parent);
  if (!contactTypeUtils.isParentOf(parentType, childType)) {
    throw new InvalidArgumentError(
      `Parent contact of type [${parentType}] is not allowed for type [${childType.id}].`
    );
  }
};
