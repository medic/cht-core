import { Doc } from '../libs/doc';
import contactTypeUtils from '@medic/contact-types-utils';
import { Nullable } from '../libs/core';
import { UuidQualifier } from '../qualifier';
import * as Place from '../place';
import { getDocById } from './libs/doc';
import { LocalDataContext, SettingsService } from './libs/data-context';
import { isNormalizedParent } from '../libs/contact';
import logger from '@medic/logger';

/** @internal */
export namespace v1 {
  const isPlace = (settings: SettingsService, uuid: string, doc: Nullable<Doc>): doc is Place.v1.Place => {
    if (!doc) {
      logger.warn(`No place found for identifier [${uuid}].`);
      return false;
    }
    const hasPlaceType = contactTypeUtils.isPlace(settings.getAll(), doc);
    if (!hasPlaceType || !isNormalizedParent(doc)) {
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
}
