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
  NonEmptyArray, NormalizedParent,
  Nullable
} from '../../libs/core';
import { Doc } from '../../libs/doc';
import { getDocsByIds, queryDocsByRange } from './doc';
import logger from '@medic/logger';

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

  return async (
    places: NonEmptyArray<Nullable<Doc>>,
    person?: Person.v1.Person,
  ): Promise<Nullable<Contact.v1.ContactWithLineage>>  => {
    const primaryContactUuids = getPrimaryContactIds(places);
    const uuidsToFetch = person ? primaryContactUuids.filter(uuid => uuid !== person._id) : primaryContactUuids;
    const fetchedContacts = await getMedicDocsById(uuidsToFetch);
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
