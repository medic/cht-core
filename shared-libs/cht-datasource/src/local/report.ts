import { LocalDataContext } from './libs/data-context';
import {
  createDoc,
  fetchAndFilterUuids,
  getDocById,
  queryDocUuidsByKey,
  queryDocUuidsByRange,
  updateDoc
} from './libs/doc';
import { FreetextQualifier, UuidQualifier, isKeyedFreetextQualifier } from '../qualifier';
import { hasField, Nullable, Page } from '../libs/core';
import * as Report from '../report';
import { Doc, isDoc } from '../libs/doc';
import logger from '@medic/logger';
import { addParentToInput, ensureHasRequiredFields,
  ensureImmutability, normalizeFreetext, validateCursor } from './libs/core';
import { END_OF_ALPHABET_MARKER } from '../libs/constants';
import { InvalidArgumentError } from '../libs/error';
import { ReportInput } from '../input';

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

  /** @internal*/
  export const create = ({
    medicDb
  } : LocalDataContext) => {
    const createReportDoc = createDoc(medicDb);
    const getReportDoc = getDocById(medicDb);
    const appendContact = async(
      input:ReportInput
    ): Promise<ReportInput> => {
      const contactDehydratedLineage = await getReportDoc(input.contact);
      if (contactDehydratedLineage === null){
        throw new InvalidArgumentError(
          `Contact with _id ${input.contact} does not exist.`
        );
      }
      input = addParentToInput(input, 'contact', contactDehydratedLineage);
      return input;
    };
    
    return async (input: ReportInput) :Promise<Report.v1.Report> => {
      if (hasField(input, { name: '_rev', type: 'string', ensureTruthyValue: true })) {
        throw new InvalidArgumentError('Cannot pass `_rev` when creating a report.');
      }
      input = await appendContact(input);
      return await createReportDoc(input) as Report.v1.Report;
    };
  };

  
  const validateReportUpdatePayload = (
    originalDoc:Doc,
    reportInput: Record<string, unknown>
  ) => {
    const immutableRequiredFields = new Set(['_rev', '_id', 'reported_date', 'contact', 'type']);
    const mutableRequiredFields = new Set(['form']);
    ensureHasRequiredFields(immutableRequiredFields, mutableRequiredFields, originalDoc, reportInput);
    ensureImmutability(immutableRequiredFields, originalDoc, reportInput);
    // Now it is safe to assign reportInput.contact to the original doc's
    // dehydrated contact lineage as the hierarchy is verified.
    reportInput.contact = originalDoc.contact;
  };

  /** @internal*/
  export const update = ({
    medicDb, settings
  }:LocalDataContext) => {
    const updateReport = updateDoc(medicDb);
    const getReport = get({medicDb, settings} as LocalDataContext);
    return async(reportInput: Record<string, unknown>):Promise<Report.v1.Report> => {
      if (!isDoc(reportInput)){
        throw new InvalidArgumentError(`Document for update is not a valid Doc ${JSON.stringify(reportInput)}`);
      }
      const originalReportDoc = await getReport({uuid: reportInput._id});
      if (originalReportDoc===null){
        throw new InvalidArgumentError(`Report not found`);
      }
      if (reportInput._rev !== originalReportDoc._rev) {
        throw new InvalidArgumentError('`_rev` does not match');
      }
      validateReportUpdatePayload(originalReportDoc, reportInput);
      return await updateReport(reportInput) as Report.v1.Report;
    };
  };

}
