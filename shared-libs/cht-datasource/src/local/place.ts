import { Doc } from '../libs/doc';
import contactTypeUtils from '@medic/contact-types-utils';
import { hasField, isNonEmptyArray, NonEmptyArray, Nullable, Page } from '../libs/core';
import { ContactTypeQualifier, UuidQualifier } from '../qualifier';
import * as Place from '../place';
import { createDoc, fetchAndFilter, getDocById, queryDocsByKey } from './libs/doc';
import { LocalDataContext, SettingsService } from './libs/data-context';
import logger from '@medic/logger';
import {
  getContactLineage,
  getLineageDocsById,
} from './libs/lineage';
import { InvalidArgumentError } from '../libs/error';
import { validateCursor } from './libs/core';
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
  export const createPlace = ({medicDb, settings}: LocalDataContext) => {
    const createPlaceDoc = createDoc(medicDb);
    return async(
      input: PlaceInput
    ):Promise<Place.v1.Place> => {

      /**
       * Ensures that places that require a parent (i.e. not at the top of the hirerarchy) 
       * have the parent field as one of the pre-configured `parents` in the `contact_types`
       * for that place.
       */
      /** @internal*/
      const validateParentPresence = async(contactTypeObject: Record<string, unknown>
        , input:Record<string, unknown> ):Promise<Doc | null> => {
        if (hasField(contactTypeObject, {name: 'parents', type: 'object'})) {
          return await ensureHasValidParentField(input, contactTypeObject);
        } else if (hasField(input, {name: 'parent', type: 'string', ensureTruthyValue: true})){
          // The current input type is meant to be at the top of the hierarchy.
          throw new InvalidArgumentError(
            `Unexpected parent for [${JSON.stringify(input)}].`
          );
        }
        return null;
      };

      const ensureHasValidParentField = 
        async(input:Record<string, unknown>, contactTypeObject: Record<string, unknown>):Promise<Doc> => {
          if (!hasField(input, {name: 'parent', type: 'string', ensureTruthyValue: true})){
            throw new InvalidArgumentError(
              `Missing or empty required field (parent) for [${JSON.stringify(input)}].`
            );
          } else {
            const parentWithLineage = await getDocById(medicDb)(input.parent);
            if (parentWithLineage === null){
              throw new InvalidArgumentError(
                `Parent does not exist for [${JSON.stringify(input)}].`
              );
            }

            // Check whether parent doc's contact_type matches with any of the allowed parents type.
            const parentTypeMatchWithAllowedParents = (contactTypeObject.parents as string[])
              .find(parent => parent===(parentWithLineage as PlaceInput).contact_type);

            if (!(parentTypeMatchWithAllowedParents)) {
              throw new InvalidArgumentError(
                `Invalid parent type for [${JSON.stringify(input)}].`
              );
            }
            return parentWithLineage;
          }
        };

      const appendParentWithLineage = async () => {
        let parentWithLineage: Doc | null = null;
        if (typeFoundInSettingsContactTypes){
          parentWithLineage = await validateParentPresence(typeFoundInSettingsContactTypes, input);
        } else if (input.parent){
          parentWithLineage = await getDocById(medicDb)(input.parent);
        } else if (input.contact_type === 'district_hospital') {
          // For legacy types, `district_hospital` is at the top of the hierarchy
          // so no need to append parent.
          return;
        } else {
          throw new InvalidArgumentError(
            `Missing or empty required field (parent) for [${JSON.stringify(input)}].`
          );
        }

        if (parentWithLineage === null){
          throw new InvalidArgumentError(
            `Parent does not exist for [${JSON.stringify(input)}].`
          );
        }
        input = {...input, parent: {
          _id: input.parent, parent: parentWithLineage.parent 
        } } as unknown as PlaceInput;
      };

      const appendContactWithLineage = async() => {
        if (!hasField(input, {name: 'contact', type: 'string', ensureTruthyValue: true})) {
          return;
        }
        const contactWithLineage = await getDocById(medicDb)(input.contact!);
        if (contactWithLineage === null){
          throw new InvalidArgumentError(
            `Contact does not exist for [${JSON.stringify(input)}].`
          );
        }
        input = {
          ...input, contact: contactWithLineage
        } as unknown as PlaceInput;
      };
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
      
      await appendParentWithLineage();
      await appendContactWithLineage();

      return await createPlaceDoc(input) as Place.v1.Place;
    };
  };
}
