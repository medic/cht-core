import { Doc } from '../libs/doc';
import contactTypeUtils from '@medic/contact-types-utils';
import { deepCopy, isNonEmptyArray, NonEmptyArray, Nullable } from '../libs/core';
import { UuidQualifier } from '../qualifier';
import * as Place from '../place';
import { getDocById, getDocsByIds } from './libs/doc';
import { LocalDataContext, SettingsService } from './libs/data-context';
import { Contact } from '../libs/contact';
import logger from '@medic/logger';
import { getLineageDocsById, getPrimaryContactIds, hydrateLineage, hydratePrimaryContact } from './libs/lineage';

/** @internal */
export namespace v1 {
  const isPlace = (settings: SettingsService, uuid: string, doc: Nullable<Doc>): doc is Place.v1.Place => {
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
      const validPlace = isPlace(settings, identifier.uuid, doc);
      return validPlace ? doc : null;
    };
  };

  /** @internal */
  export const getWithLineage = ({ medicDb, settings }: LocalDataContext) => {
    const getLineageDocs = getLineageDocsById(medicDb);
    const getMedicDocsById = getDocsByIds(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<Place.v1.PlaceWithLineage>> => {
      const [place, ...lineagePlaces] = await getLineageDocs(identifier.uuid);
      if (!isPlace(settings, identifier.uuid, place)) {
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
}
