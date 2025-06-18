import { LocalDataContext } from './libs/data-context';
import {
  fetchAndFilterUuids,
  getDocById,
  queryDocUuidsByKey,
  queryDocUuidsByRange
} from './libs/doc';
import { FreetextQualifier, UuidQualifier, isKeyedFreetextQualifier } from '../qualifier';
import { Nullable, Page, isNonEmptyArray, NormalizedParent } from '../libs/core';
import * as Report from '../report';
import { Doc } from '../libs/doc';
import logger from '@medic/logger';
import { normalizeFreetext, validateCursor } from './libs/core';
import { END_OF_ALPHABET_MARKER } from '../libs/constants';
import { getContactLineage, getLineageDocsById } from '../local/libs/lineage';
import contactTypeUtils from '@medic/contact-types-utils';
import * as Person from '../person';


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
  export const getWithLineage = ({ medicDb, settings }: LocalDataContext) => {
    const getLineageDocs = getLineageDocsById(medicDb);
    const getLineage = getContactLineage(medicDb);

    return async (identifier: UuidQualifier): Promise<Nullable<Report.v1.ReportWithLineage>> => {
      const [report, ...contacts] = await getLineageDocs(identifier.uuid);
      if (!isReport(report, identifier.uuid)) {
        return null;
      }

      if (!isNonEmptyArray(contacts)) {
        logger.debug(`No lineage contacts found for report [${identifier.uuid}].`);
        return report;
      }

      const [baseContact, ...lineageContacts] = contacts;
      if (baseContact && contactTypeUtils.isPerson(settings.getAll(), baseContact)) {
        return {
          ...report,
          contact: isNonEmptyArray(lineageContacts)
                      ? (await getLineage(lineageContacts, baseContact as Person.v1.Person))!
                      : baseContact as  NormalizedParent
        };
      }

      return {
        ...report,
        contact: (await getLineage(contacts))!
      };
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
