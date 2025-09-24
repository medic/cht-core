import { Doc } from '../libs/doc';
import contactTypeUtils from '@medic/contact-types-utils';
import { Nullable, Page } from '../libs/core';
import { ContactTypeQualifier, UuidQualifier } from '../qualifier';
import * as Place from '../place';
import { fetchAndFilter, getDocById, queryDocsByKey } from './libs/doc';
import { LocalDataContext, SettingsService } from './libs/data-context';
import logger from '@medic/logger';
import { InvalidArgumentError } from '../libs/error';
import { validateCursor } from './libs/core';
import { fetchHydratedDoc } from './libs/lineage';

/** @internal */
export namespace v1 {
  const isPlace = (settings: SettingsService) => (doc: Nullable<Doc>, uuid?: string): doc is Place.v1.Place => {
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
    const fetchHydratedMedicDoc = fetchHydratedDoc(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<Place.v1.PlaceWithLineage>> => {
      const place = await fetchHydratedMedicDoc(identifier.uuid);
      if (!isPlace(settings)(place, identifier.uuid)) {
        return null;
      }

      return place;
    };
  };

  /** @internal */
  export const getPage = ({ medicDb, settings }: LocalDataContext) => {
    const getDocsByPage = queryDocsByKey(medicDb, 'medic-client/contacts_by_type', false);

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
}
