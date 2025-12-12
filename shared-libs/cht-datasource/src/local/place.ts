import { Doc, isDoc } from '../libs/doc';
import contactTypeUtils from '@medic/contact-types-utils';
import { assertHasRequiredField, DataObject, Nullable, Page } from '../libs/core';
import { ContactTypeQualifier, UuidQualifier } from '../qualifier';
import * as Place from '../place';
import { createDoc, fetchAndFilter, getDocById, getDocsByIds, queryDocsByKey, updateDoc } from './libs/doc';
import { LocalDataContext, SettingsService } from './libs/data-context';
import logger from '@medic/logger';
import { InvalidArgumentError, ResourceNotFoundError } from '../libs/error';
import { assertFieldsUnchanged, getReportedDateTimestamp, validateCursor } from './libs/core';
import * as Input from '../input';
import {
  assertHasValidParentType,
  assertSameParentLineage,
  fetchHydratedDoc,
  getContactIdForUpdate,
  getUpdatedContact,
  minifyDoc
} from './libs/lineage';
import { assertPlaceInput } from '../libs/parameter-validators';
import * as LocalContact from './contact';

const DEFAULT_PLACE_TYPES_DICT: Record<string, { id: string, parents?: string[] } | undefined> = {
  district_hospital: { id: 'district_hospital' },
  health_center: {
    id: 'health_center',
    parents: ['district_hospital'],
  },
  clinic: {
    id: 'clinic',
    parents: ['health_center'],
  },
};

const getPlaceType = (
  settings: DataObject,
  input: Input.v1.PlaceInput
) => {
  const type: Record<string, unknown> | undefined = contactTypeUtils.getTypeById(settings, input.type)
    ?? DEFAULT_PLACE_TYPES_DICT[input.type];
  if (!type || type.person) {
    throw new InvalidArgumentError(`[${input.type}] is not a valid place type.`);
  }
  return type;
};

const getTypeProperties = (settings: DataObject, input: Input.v1.PlaceInput) => {
  getPlaceType(settings, input);
  const customType = contactTypeUtils.getTypeById(settings, input.type);
  return customType
    ? { contact_type: input.type, type: 'contact' }
    : { type: input.type };
};

const getPrimaryContactForCreate = (settings: SettingsService, input: Input.v1.PlaceInput, contact: Nullable<Doc>) => {
  if (!input.contact) {
    return undefined;
  }
  if (!LocalContact.v1.isContact(settings, contact)) {
    throw new InvalidArgumentError(`Primary contact [${input.contact}] not found.`);
  }
  return contact;
};

const getParentForCreate = (
  settings: SettingsService,
  input: Input.v1.PlaceInput,
  parentDoc: Nullable<Doc>
) => {
  const childType = getPlaceType(settings.getAll(), input);
  if (!input.parent && !childType.parents) {
    return undefined;
  }
  if (input.parent && !childType.parents) {
    throw new InvalidArgumentError(`Place type [${childType.id}] does not support having a parent contact.`);
  }
  if (!input.parent && childType.parents) {
    throw new InvalidArgumentError(`Place type [${childType.id}] requires a parent contact.`);
  }
  if (!v1.isPlace(settings, parentDoc)) {
    throw new InvalidArgumentError(`Parent contact [${input.parent}] not found.`);
  }
  assertHasValidParentType(childType, parentDoc);
  return parentDoc;
};

/** @internal */
export namespace v1 {
  /** @internal*/
  export const isPlace = (settings: SettingsService, doc?: Nullable<Doc>): doc is Place.v1.Place => {
    if (!isDoc(doc)) {
      return false;
    }
    return contactTypeUtils.isPlace(settings.getAll(), doc);
  };

  /** @internal */
  export const get = ({ medicDb, settings }: LocalDataContext) => {
    const getMedicDocById = getDocById(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<Place.v1.Place>> => {
      const doc = await getMedicDocById(identifier.uuid);
      if (!isPlace(settings, doc)) {
        logger.warn(`Document [${identifier.uuid}] is not a valid place.`);
        return null;
      }
      return doc;
    };
  };

  /** @internal */
  export const getWithLineage = ({ medicDb, settings }: LocalDataContext) => {
    const fetchHydratedMedicDoc = fetchHydratedDoc(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<Place.v1.PlaceWithLineage>> => {
      const place = await fetchHydratedMedicDoc(identifier.uuid);
      if (!isPlace(settings, place)) {
        logger.warn(`Document [${identifier.uuid}] is not a valid place.`);
        return null;
      }

      return place;
    };
  };

  /** @internal */
  export const getPage = ({ medicDb, settings }: LocalDataContext) => {
    const getDocsByPage = queryDocsByKey(medicDb, 'medic-client/contacts_by_type');

    return async (
      placeType: ContactTypeQualifier,
      cursor: Nullable<string>,
      limit: number
    ): Promise<Page<Place.v1.Place>> => {
      const placeTypes = contactTypeUtils.getPlaceTypes(settings.getAll());
      const placeTypeIds = placeTypes.map(p => p.id);

      if (!placeTypeIds.includes(placeType.contactType)) {
        throw new InvalidArgumentError(`Invalid contact type [${placeType.contactType}].`);
      }

      const skip = validateCursor(cursor);

      const getDocsByPageWithPlaceType = (
        limit: number,
        skip: number
      ) => getDocsByPage([placeType.contactType], limit, skip);

      return await fetchAndFilter(
        getDocsByPageWithPlaceType,
        (doc: Nullable<Doc>) => isPlace(settings, doc),
        limit
      )(limit, skip) as Page<Place.v1.Place>;
    };
  };

  /** @internal*/
  export const create = ({ medicDb, settings }: LocalDataContext) => {
    const getMedicDocsByIds = getDocsByIds(medicDb);
    const createMedicDoc = createDoc(medicDb);
    const minifyLineage = minifyDoc(medicDb);

    return async (input: Input.v1.PlaceInput): Promise<Place.v1.Place> => {
      assertPlaceInput(input);
      const settingsData = settings.getAll();
      const typeProperties = getTypeProperties(settingsData, input);
      const [
        parentDoc,
        contactDoc
      ] = await getMedicDocsByIds([input.parent, input.contact]);
      const contact = getPrimaryContactForCreate(settings, input, contactDoc);
      const parent = getParentForCreate(settings, input, parentDoc);
      const placeDoc = minifyLineage({
        ...input,
        ...typeProperties,
        parent,
        contact,
        reported_date: getReportedDateTimestamp(input.reported_date),
      });
      return createMedicDoc(placeDoc) as Promise<Place.v1.Place>;
    };
  };

  /** @internal*/
  export const update = (dataContext: LocalDataContext) => {
    const { medicDb, settings } = dataContext;
    const getMedicDocsByIds = getDocsByIds(medicDb);
    const updateMedicDoc = updateDoc(medicDb);
    const minifyMedicDoc = minifyDoc(medicDb);
    const getContactForUpdate = getUpdatedContact(settings, medicDb);

    return async <T extends Place.v1.Place | Place.v1.PlaceWithLineage>(
      updatedPlace: Input.v1.UpdatePlaceInput<T>
    ): Promise<T> => {
      if (!isPlace(settings, updatedPlace)) {
        throw new InvalidArgumentError('Valid _id, _rev, and type fields must be provided.');
      }
      const [originalPlace, contactDoc] = await getMedicDocsByIds([
        updatedPlace._id,
        getContactIdForUpdate(updatedPlace)
      ]);
      if (!isPlace(settings, originalPlace)) {
        throw new ResourceNotFoundError(`Place record [${updatedPlace._id}] not found.`);
      }

      const contact = getContactForUpdate(originalPlace, updatedPlace, contactDoc);
      assertFieldsUnchanged(originalPlace, updatedPlace, ['_rev', 'reported_date', 'type', 'contact_type']);
      if (originalPlace.name !== updatedPlace.name) {
        assertHasRequiredField(updatedPlace, { name: 'name', type: 'string' }, InvalidArgumentError);
      }
      assertSameParentLineage(originalPlace, updatedPlace);

      const updatedPlaceDoc = {
        ...updatedPlace,
        contact
      };
      const _rev = await updateMedicDoc(minifyMedicDoc(updatedPlaceDoc));
      return { ...updatedPlaceDoc, _rev };
    };
  };
}
