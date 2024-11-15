import { LocalDataContext } from './libs/data-context';
import { fetchAndFilter, getDocById, queryDocsByKey, queryDocsByRange } from './libs/doc';
import { FreetextQualifier, UuidQualifier } from '../qualifier';
import { Nullable, Page } from '../libs/core';
import * as Report from '../report';
import { Doc } from '../libs/doc';
import logger from '@medic/logger';
import { validateCursor } from './libs/core';

/** @internal */
export namespace v1 {
  const END_OF_ALPHABET = '\ufff0';
  const isReport = () => (doc: Nullable<Doc>, uuid?: string): doc is Report.v1.Report => {
    if (!doc) {
      if (uuid) {
        logger.warn(`No report found for identifier [${uuid}].`);
        return false;
      }
    } else if (doc.type !== 'data_record' && !doc.form) {
      logger.warn(`Document [${doc._id}] is not a valid report.`);
    }

    return true;
  };

  /** @internal */
  export const get = ({ medicDb }: LocalDataContext) => {
    const getMedicDocById = getDocById(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<Report.v1.Report>> => {
      const doc = await getMedicDocById(identifier.uuid);

      if (!isReport()(doc, identifier.uuid)) {
        return null;
      }
      return doc;
    };
  };

  /** @internal */
  export const getPage = ({ medicDb }: LocalDataContext) => {
    const getReportsByFreeText = queryDocsByKey(medicDb, 'medic-client/reports_by_freetext');
    const getReportsByFreeTextRange = queryDocsByRange(medicDb, 'medic-client/reports_by_freetext');

    const getDocsFnForFreetextType = (
      qualifier: FreetextQualifier
    ): (limit: number, skip: number) => Promise<Nullable<Doc>[]> => {
      if (qualifier.freetext.includes(':')) {
        return (limit, skip) => getReportsByFreeText([qualifier.freetext], limit, skip);
      }
      return (limit, skip) => getReportsByFreeTextRange(
        [qualifier.freetext],
        [qualifier.freetext + END_OF_ALPHABET],
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
      const pagedDocs = await fetchAndFilter(getDocsFn, isReport(), limit)(limit, skip);

      return {
        data: pagedDocs.data.map((doc) => doc._id),
        cursor: pagedDocs.cursor
      };
    };
  };
}
