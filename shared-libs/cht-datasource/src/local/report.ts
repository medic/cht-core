import { LocalDataContext } from './libs/data-context';
import { fetchAndFilter, getDocById, queryDocsByKey } from './libs/doc';
import { FreetextQualifier, UuidQualifier } from '../qualifier';
import { Nullable, Page } from '../libs/core';
import * as Report from '../report';
import { Doc } from '../libs/doc';
import logger from '@medic/logger';
import { InvalidArgumentError } from '../libs/error';

/** @internal */
export namespace v1 {
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
    const getDocsByKey = queryDocsByKey(medicDb, 'medic-client/reports_by_freetext');

    return async (
      qualifier: FreetextQualifier,
      cursor: Nullable<string>,
      limit:  number
    ): Promise<Page<string>> => {
      const word = qualifier.freetext;

      // Adding a number skip variable here so as not to confuse ourselves
      const skip = Number(cursor);
      if (isNaN(skip) || skip < 0 || !Number.isInteger(skip)) {
        throw new InvalidArgumentError(`Invalid cursor token: [${String(cursor)}].`);
      }

      const getDocsFn = (limit: number, skip: number) => getDocsByKey([ word ], limit, skip);

      const pagedDocs = await fetchAndFilter(getDocsFn, isReport(), limit)(limit, skip);

      return {
        data: pagedDocs.data.map((doc) => doc._id),
        cursor: pagedDocs.cursor
      };
    };
  };
}
