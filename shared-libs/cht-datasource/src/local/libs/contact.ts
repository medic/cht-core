import { Contact, isNormalizedParent, NormalizedParent } from '../../libs/contact';
import { DataObject, isNonEmptyArray, NonEmptyArray, Nullable } from '../../libs/core';
import { Doc, isDoc } from '../../libs/doc';
import { getDocsByIds } from './doc';
import * as Person from '../../person';
import * as Place from '../../place';

const getPrimaryContactUuids = (places: NonEmptyArray<Nullable<Doc>>): string[] => places
  .filter(isDoc)
  .map(({ contact }) => contact)
  .filter(isNormalizedParent)
  .map(({ _id }) => _id);

const findById = <T extends Doc>(docs: T[], id: string): Nullable<T> => docs.find(doc => doc._id === id) ?? null;

const hydratePrimaryContact = (contacts: Doc[]) => (place: Nullable<Doc>): Nullable<Doc> => {
  if (!place || !isNormalizedParent(place.contact)) {
    return place;
  }
  const contact = findById(contacts, place.contact._id);
  if (!contact) {
    return place;
  }
  return {
    ...place,
    contact
  };
};

const mergeLineage = (lineage: DataObject[], parent?: DataObject): DataObject => {
  if (!isNonEmptyArray(lineage)) {
    return parent!;
  }
  const child = lineage.at(-1)!;
  const mergedChild = {
    ...child,
    parent: parent ?? child.parent
  };
  return mergeLineage(lineage.slice(-1), mergedChild);
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

const hydrateLineage = (
  contact: Contact,
  lineage: Nullable<Doc>[]
): Contact => {
  const fullLineage = lineage
    .map((place, index) => {
      if (place) {
        return place;
      }
      // If no doc was found, just add a placeholder object with the id from the contact
      return { _id: getParentUuid(index, contact.parent) };
    });

  return mergeLineage([contact, ...fullLineage]) as Contact;
};

/** @internal */
export const getContactWithLineage = async <T extends Person.v1.PersonWithLineage | Place.v1.PlaceWithLineage>(
  medicDb: PouchDB.Database<Doc>,
  contact: Contact,
  lineagePlaces: NonEmptyArray<Nullable<Doc>>
): Promise<T> => {
  const getMedicDocsById = getDocsByIds(medicDb);
  const contactUuids = getPrimaryContactUuids(lineagePlaces)
    .filter(uuid => uuid !== contact._id);
  const contacts = [contact, ...await getMedicDocsById(contactUuids)];
  const linagePlacesWithContact = lineagePlaces.map(hydratePrimaryContact(contacts));
  return hydrateLineage(contact, linagePlacesWithContact) as T;
};
