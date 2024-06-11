import { Contact, NormalizedParent } from '../../libs/contact';
import {
  DataObject,
  findById,
  isIdentifiable,
  isNonEmptyArray,
  isNotNull,
  NonEmptyArray,
  Nullable
} from '../../libs/core';
import { Doc } from '../../libs/doc';
import { queryDocsByKey } from './doc';

/**
 * Returns the identified document along with the parent documents recorded for its lineage. The returned array is
 * sorted such that the identified document is the first element and the parent documents are in order of lineage.
 * @internal
 */
export const getLineageDocsById = (
  medicDb: PouchDB.Database<Doc>
): (id: string) => Promise<Nullable<Doc>[]> => queryDocsByKey(medicDb, 'medic-client/docs_by_id_lineage');

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
  const child = lineage.at(-1)!;
  const mergedChild = {
    ...child,
    parent: parent
  };
  return mergeLineage(lineage.slice(0, -1), mergedChild);
};

/** @internal */
export const hydrateLineage = (
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
  const hierarchy = [contact, ...fullLineage];
  return mergeLineage(hierarchy.slice(0, -1), hierarchy.at(-1)!) as Contact;
};
