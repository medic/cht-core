import { Doc, isDoc } from '../libs/doc';
import contactTypeUtils from '@medic/contact-types-utils';
import { hasField, isNonEmptyArray, NonEmptyArray, Nullable, Page } from '../libs/core';
import { ContactTypeQualifier, UuidQualifier } from '../qualifier';
import * as Place from '../place';
import { createDoc, fetchAndFilter, getDocById, queryDocsByKey, updateDoc } from './libs/doc';
import { LocalDataContext, SettingsService } from './libs/data-context';
import logger from '@medic/logger';
import {
  getContactLineage,
  getLineageDocsById,
} from './libs/lineage';
import { InvalidArgumentError } from '../libs/error';
import { 
  addParentToInput, 
  ensureHasRequiredFields,
  ensureImmutability,
  validateCursor 
} from './libs/core';
import { PlaceInput } from '../input';

/** @internal */
export namespace v1 {
  /** @internal*/
  export const isPlace = (settings: SettingsService) => (doc: Nullable<Doc>, uuid?: string): doc is Place.v1.Place => {
    if (!doc) {
      if (uuid) {
        logger.warn(`No place found for identifier [${uuid}].`);
      }
      return false;
    }
    const hasPlaceType = contactTypeUtils.isPlace(settings.getAll(), doc);
    if (!hasPlaceType) {
      logger.warn(`Document [${doc._id}] is not a valid place.`);
      return false;
    }
    return true;
  };

  /** @internal */
  export const get = ({ medicDb, settings }: LocalDataContext) => {
    const getMedicDocById = getDocById(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<Place.v1.Place>> => {
      const doc = await getMedicDocById(identifier.uuid);
      const validPlace = isPlace(settings)(doc, identifier.uuid);
      return validPlace ? doc : null;
    };
  };

  /** @internal */
  export const getWithLineage = ({ medicDb, settings }: LocalDataContext) => {
    const getLineageDocs = getLineageDocsById(medicDb);
    const getLineage = getContactLineage(medicDb);

    return async (identifier: UuidQualifier): Promise<Nullable<Place.v1.PlaceWithLineage>> => {
      const [place, ...lineagePlaces] = await getLineageDocs(identifier.uuid);
      if (!isPlace(settings)(place, identifier.uuid)) {
        return null;
      }
      // Intentionally not further validating lineage. For passivity, lineage problems should not block retrieval.
      if (!isNonEmptyArray(lineagePlaces)) {
        logger.debug(`No lineage places found for place [${identifier.uuid}].`);
        return place;
      }

      const places: NonEmptyArray<Nullable<Doc>> = [place, ...lineagePlaces];
      return await getLineage(places) as Nullable<Place.v1.PlaceWithLineage>;
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
        isPlace(settings),
        limit
      )(limit, skip) as Page<Place.v1.Place>;
    };
  };

  /** @internal*/
  export const create = ({medicDb, settings}: LocalDataContext) => {
    const createPlaceDoc = createDoc(medicDb);
    const getPlaceDoc = getDocById(medicDb);
    /**
     * Ensures that places that require a parent (i.e. not at the top of the hirerarchy) 
     * have the parent field as one of the pre-configured `parents` in the `contact_types`
     * for that place.
     */
    /** @internal*/
    const validateParentPresence = async(
      contactTypeObject: Record<string, unknown>,
      input:Record<string, unknown> 
    ): Promise<Nullable<Doc>> => {
      if (hasField(contactTypeObject, {name: 'parents', type: 'object'})) {
        return await ensureHasValidParentFieldAndReturnParentDoc(input, contactTypeObject);
      } else if (hasField(input, {name: 'parent', type: 'string', ensureTruthyValue: true})){
        // The current input type is meant to be at the top of the hierarchy.
        throw new InvalidArgumentError(
          `Unexpected parent for [${JSON.stringify(input)}].`
        );
      }
      return null;
    };

    const ensureHasValidParentFieldAndReturnParentDoc = async(
      input:Record<string, unknown>,
      contactTypeObject: Record<string, unknown>
    ): Promise<Doc> => {
      if (!hasField(input, {name: 'parent', type: 'string', ensureTruthyValue: true})){
        throw new InvalidArgumentError(
          `Missing or empty required field (parent) for [${JSON.stringify(input)}].`
        );
      } 
      const parentDoc = await getPlaceDoc(input.parent);
      if (parentDoc === null){
        throw new InvalidArgumentError(
          `Parent with _id ${input.parent} does not exist.`
        );
      }

      // Check whether parent doc's `contact_type` or `type`(if `contact_type` is absent) 
      // matches with any of the allowed parents type.
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      const typeToMatch = (parentDoc as PlaceInput).contact_type || (parentDoc as PlaceInput).type;
      const parentTypeMatchWithAllowedParents = (contactTypeObject.parents as string[])
        .find(parent => parent===typeToMatch);

      if (!(parentTypeMatchWithAllowedParents)) {
        throw new InvalidArgumentError(
          `Invalid parent type for [${JSON.stringify(input)}].`
        );
      }
      return parentDoc;
         
    };
      
    const getParentDoc = async (
      typeFoundInSettingsContactTypes:Record<string, unknown>|undefined,
      input:PlaceInput
    ): Promise<Nullable<Doc>> => {
      if (typeFoundInSettingsContactTypes) {
        // This will throw error if parent is required and missing.
        return await validateParentPresence(typeFoundInSettingsContactTypes, input);
        // null is returned only when parent is not required and it is not present in the input
      }

      if (input.parent) {
        const parentDoc = await getPlaceDoc(input.parent);
        if (parentDoc === null) {
          throw new InvalidArgumentError(
            `Parent with _id ${input.parent} does not exist.`
          );
        }
        return parentDoc;
      }

      return null;
    };
    
    const appendParent = async (
      typeFoundInSettingsContactTypes:Record<string, unknown>|undefined,
      input:PlaceInput
    ):Promise<PlaceInput> => {
      let parentDoc: Nullable<Doc> = null;
      parentDoc = await getParentDoc(typeFoundInSettingsContactTypes, input);
      if (!parentDoc) {
        return input;
      }

      input = addParentToInput(input, 'parent', parentDoc);
      return input;
    };

    const appendContact = async (
      input:PlaceInput
    ) => {
      if (!hasField(input, {name: 'contact', type: 'string', ensureTruthyValue: true})) {
        return input;
      }
        
      const contactDehydratedLineage = await getPlaceDoc(input.contact!); //NoSONAR
      if (contactDehydratedLineage === null){
        throw new InvalidArgumentError(
          `Contact with _id ${input.contact!} does not exist.` //NoSONAR
        );
      }
      input = addParentToInput(input, 'contact', contactDehydratedLineage);
      return input;
    };
    return async(
      input: PlaceInput
    ):Promise<Place.v1.Place> => {

  
      if (hasField(input, { name: '_rev', type: 'string', ensureTruthyValue: true })) {
        throw new InvalidArgumentError('Cannot pass `_rev` when creating a place.');
      }

      // This check can only be done when we have the contact_types from LocalDataContext.
      const allowedContactTypes = contactTypeUtils.getContactTypes(settings.getAll());
      const typeFoundInSettingsContactTypes = allowedContactTypes.find(type => type.id === input.type);
      const typeIsHardCodedPlaceType = input.type === 'place';
      if (!typeFoundInSettingsContactTypes && !typeIsHardCodedPlaceType) {
        throw new InvalidArgumentError('Invalid place type.');
      }
      
      // Append `contact_type` for newer versions.
      if (typeFoundInSettingsContactTypes){
        input={
          ...input,
          contact_type: input.type,
          type: 'contact',
        } as unknown as PlaceInput;
      }
      
      input = await appendParent(typeFoundInSettingsContactTypes, input);
      input = await appendContact(input);

      return await createPlaceDoc(input) as Place.v1.Place;
    };
  };

  const validateUpdatePlacePayload = (
    originalDoc: Doc,
    placeInput: Record<string, unknown>
  ):void => {
    const immutableRequiredFields = new Set(['_rev', '_id', 'type', 'reported_date']);
    const mutableRequiredFields = new Set(['name']);
    const hasParent = hasField(originalDoc, {type: 'object', name: 'parent', ensureTruthyValue: true}); 
    const hasContact = hasField(originalDoc, {type: 'object', name: 'contact', ensureTruthyValue: true}); 
    if (originalDoc.type==='contact'){
      immutableRequiredFields.add('contact_type');
    }
    if (hasParent){
      immutableRequiredFields.add('parent');
    }
    if (hasContact){
      immutableRequiredFields.add('contact');
    }
    ensureHasRequiredFields(immutableRequiredFields, mutableRequiredFields, originalDoc, placeInput);
    ensureImmutability(immutableRequiredFields, originalDoc, placeInput);
    if (hasParent) {
      placeInput.parent = originalDoc.parent;
    }
    if (hasContact) {
      placeInput.contact = originalDoc.contact;
    }
  };

  /** @internal*/
  export const update = ({medicDb, settings}:LocalDataContext) => {
    const updatePlace = updateDoc(medicDb);
    const getPlace = get({medicDb, settings} as LocalDataContext);
    return async(placeInput: Record<string, unknown>):Promise<Place.v1.Place> => {
      if (!isDoc(placeInput)){
        throw new InvalidArgumentError(`Document for update is not a valid Doc ${JSON.stringify(placeInput)}`);
      }
      const originalDoc = await getPlace({uuid: placeInput._id});
      if (originalDoc===null){
        throw new InvalidArgumentError(`Place not found`);
      }
      validateUpdatePlacePayload(originalDoc, placeInput);
      return await updatePlace(placeInput) as Place.v1.Place;
    };
  };
}
