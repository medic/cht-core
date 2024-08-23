import { Doc } from '../libs/doc';
import contactTypeUtils from '@medic/contact-types-utils';
import { deepCopy, fetchAndFilter, isNonEmptyArray, NonEmptyArray, Nullable, Page } from '../libs/core';
import { ContactTypeQualifier, UuidQualifier } from '../qualifier';
import * as Place from '../place';
import { getDocById, getDocsByIds, queryDocsByKey } from './libs/doc';
import { LocalDataContext, SettingsService } from './libs/data-context';
import { Contact } from '../libs/contact';
import logger from '@medic/logger';
import { getLineageDocsById, getPrimaryContactIds, hydrateLineage, hydratePrimaryContact } from './libs/lineage';
import { InvalidArgumentError } from '../libs/error';

/** @internal */
export namespace v1 {
  const isPlace = (settings: SettingsService, doc: Nullable<Doc>, uuid = ''): doc is Place.v1.Place => {
    if (!doc) {
      logger.warn(`No place found for identifier [${uuid}].`);
      return false;
    }
    const hasPlaceType = contactTypeUtils.isPlace(settings.getAll(), doc);
    if (!hasPlaceType) {
      logger.warn(`Document [${uuid}] is not a valid place.`);
      return false;
    }
    return true;
  };

  /** @internal */
  export const get = ({ medicDb, settings }: LocalDataContext) => {
    const getMedicDocById = getDocById(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<Place.v1.Place>> => {
      const doc = await getMedicDocById(identifier.uuid);
      const validPlace = isPlace(settings, doc, identifier.uuid);
      return validPlace ? doc : null;
    };
  };

  /** @internal */
  export const getWithLineage = ({ medicDb, settings }: LocalDataContext) => {
    const getLineageDocs = getLineageDocsById(medicDb);
    const getMedicDocsById = getDocsByIds(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<Place.v1.PlaceWithLineage>> => {
      const [place, ...lineagePlaces] = await getLineageDocs(identifier.uuid);
      if (!isPlace(settings, place, identifier.uuid)) {
        return null;
      }
      // Intentionally not further validating lineage. For passivity, lineage problems should not block retrieval.
      if (!isNonEmptyArray(lineagePlaces)) {
        logger.debug(`No lineage places found for place [${identifier.uuid}].`);
        return place;
      }

      const places: NonEmptyArray<Nullable<Doc>> = [place, ...lineagePlaces];
      const contactUuids = getPrimaryContactIds(places);
      const contacts = await getMedicDocsById(contactUuids);
      const [placeWithContact, ...linagePlacesWithContact] = places.map(hydratePrimaryContact(contacts));
      const placeWithLineage = hydrateLineage(placeWithContact as Contact, linagePlacesWithContact);
      return deepCopy(placeWithLineage);
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

      // Adding a number skip variable here so as not to confuse ourselves
      const skip = Number(cursor);
      if (isNaN(skip) || skip < 0 || !Number.isInteger(skip)) {
        throw new InvalidArgumentError(`Invalid cursor token: [${String(cursor)}]`);
      }

      return await fetchAndFilter(
        getDocsByPage,
        isPlace,
        settings,
        placeType.contactType,
        limit
      )(limit, skip) as Page<Place.v1.Place>;
    };
  };
}
