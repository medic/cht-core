import { LocalDataContext } from './libs/data-context';
import {
  fetchAndFilterUuids,
  getDocById,
  queryDocUuidsByKey,
  queryDocUuidsByRange
} from './libs/doc';
import { FreetextQualifier, UuidQualifier, isKeyedFreetextQualifier } from '../qualifier';
import { Nullable, Page } from '../libs/core';
import * as Report from '../report';
import { Doc } from '../libs/doc';
import logger from '@medic/logger';
import { normalizeFreetext, validateCursor } from './libs/core';
import { END_OF_ALPHABET_MARKER } from '../libs/constants';

/** @internal */
export namespace v1 {
  const isReport = (doc: Nullable<Doc>, uuid?: string): doc is Report.v1.Report => {
    if (!doc) {
      if (uuid) {
        logger.warn(`No report found for identifier [${uuid}].`);
      }
      return false;
    } else if (doc.type !== 'data_record' || !doc.form) {
      logger.warn(`Document [${doc._id}] is not a valid report.`);
      return false;
    }

    return true;
  };

  /** @internal */
  export const get = ({ medicDb }: LocalDataContext) => {
    const getMedicDocById = getDocById(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<Report.v1.Report>> => {
      const doc = await getMedicDocById(identifier.uuid);

      if (!isReport(doc, identifier.uuid)) {
        return null;
      }
      return doc;
    };
  };

  /** @internal */
  export const getUuidsPage = ({ medicDb }: LocalDataContext) => {
    const getByExactMatchFreetext = queryDocUuidsByKey(medicDb, 'medic-client/reports_by_freetext');
    const getByStartsWithFreetext = queryDocUuidsByRange(medicDb, 'medic-client/reports_by_freetext');

    const getDocsFnForFreetextType = (
      qualifier: FreetextQualifier
    ): (limit: number, skip: number) => Promise<string[]> => {
      if (isKeyedFreetextQualifier(qualifier)) {
        return (limit, skip) => getByExactMatchFreetext([normalizeFreetext(qualifier.freetext)], limit, skip);
      }
      return (limit, skip) => getByStartsWithFreetext(
        [normalizeFreetext(qualifier.freetext)],
        [normalizeFreetext(qualifier.freetext) + END_OF_ALPHABET_MARKER],
        limit,
        skip
      );
    };

    return async (
      qualifier: FreetextQualifier,
      cursor: Nullable<string>,
      limit:  number
    ): Promise<Page<string>> => {
      const skip = validateCursor(cursor);
      const getDocsFn = getDocsFnForFreetextType(qualifier);

      return await fetchAndFilterUuids(getDocsFn, limit)(limit, skip);
    };
  };
}
