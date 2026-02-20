import { LocalDataContext } from './libs/data-context';
import { fetchAndFilterUuids, getDocById, queryDocUuidsByKey, queryDocUuidsByRange } from './libs/doc';
import { FreetextQualifier, isKeyedFreetextQualifier, UuidQualifier } from '../qualifier';
import { Nullable, Page } from '../libs/core';
import * as Report from '../report';
import { Doc } from '../libs/doc';
import logger from '@medic/logger';
import { normalizeFreetextQualifier, validateCursor } from './libs/core';
import { END_OF_ALPHABET_MARKER } from '../libs/constants';
import { fetchHydratedDoc } from './libs/lineage';
import { queryByFreetext, useNouveauIndexes } from './libs/nouveau';

const getOfflineFreetextQueryFn = (medicDb: PouchDB.Database<Doc>) => {
  const queryViewFreetextByKey = queryDocUuidsByKey(medicDb, 'medic-offline-freetext/reports_by_freetext');
  const queryViewFreetextByRange = queryDocUuidsByRange(medicDb, 'medic-offline-freetext/reports_by_freetext');

  return (qualifier: FreetextQualifier) => {
    if (isKeyedFreetextQualifier(qualifier)) {
      return (limit: number, skip: number) => queryViewFreetextByKey([qualifier.freetext], limit, skip);
    }

    return (limit: number, skip: number) => queryViewFreetextByRange(
      [qualifier.freetext],
      [qualifier.freetext + END_OF_ALPHABET_MARKER],
      limit,
      skip
    );
  };
};

/** @internal */
export namespace v1 {
  const isReport = (doc: Nullable<Doc>, uuid?: string): doc is Report.v1.Report => {
    if (!doc) {
      if (uuid) {
        logger.warn(`No report found for identifier [${uuid}].`);
      }
      return false;
    }

    if (doc.type !== 'data_record' || !doc.form) {
      logger.warn(`Document [${doc._id}] is not a report.`);
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
  export const getWithLineage = ({ medicDb }: LocalDataContext) => {
    const fetchHydratedMedicDoc = fetchHydratedDoc(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<Report.v1.ReportWithLineage>> => {
      const report = await fetchHydratedMedicDoc(identifier.uuid);
      if (!isReport(report, identifier.uuid)) {
        return null;
      }

      return report;
    };
  };

  /** @internal */
  export const getUuidsPage = ({ medicDb }: LocalDataContext) => {
    const queryNouveauFreetext = queryByFreetext(medicDb, 'reports_by_freetext');
    const getOfflineFreetextQueryPageFn = getOfflineFreetextQueryFn(medicDb);
    const promisedUseNouveau = useNouveauIndexes(medicDb);

    return async (
      qualifier: FreetextQualifier,
      cursor: Nullable<string>,
      limit: number
    ): Promise<Page<string>> => {
      const freetextQualifier = normalizeFreetextQualifier(qualifier);
      if (await promisedUseNouveau) {
        // Running server-side. Use Nouveau indexes.
        return await queryNouveauFreetext(freetextQualifier, cursor, limit);
      }

      // Use client-side offline freetext views.
      const skip = validateCursor(cursor);
      const getPageFn = getOfflineFreetextQueryPageFn(freetextQualifier);
      return fetchAndFilterUuids(getPageFn, limit)(limit, skip);
    };
  };
}
