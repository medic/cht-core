import { isOffline, LocalDataContext } from './libs/data-context';
import {
  createDoc,
  fetchAndFilterUuids,
  getDocById,
  queryDocUuidsByKey,
  updateDoc,
  queryDocUuidsByRange,
  queryNouveauIndexUuids,
} from './libs/doc';
import { FreetextQualifier, isKeyedFreetextQualifier, UuidQualifier } from '../qualifier';
import { hasField, Nullable, Page } from '../libs/core';
import * as Report from '../report';
import { Doc, isDoc } from '../libs/doc';
import logger from '@medic/logger';
import {
  addParentToInput,
  ensureHasRequiredFields,
  ensureImmutability,
  normalizeFreetext,
  validateCursor,
  QueryParams,
} from './libs/core';
import { END_OF_ALPHABET_MARKER } from '../libs/constants';
import { InvalidArgumentError } from '../libs/error';
import * as Input from '../input';
import { fetchHydratedDoc } from './libs/lineage';

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
    // Define offline query functions
    const getByExactMatchFreetext = queryDocUuidsByKey(medicDb, 'medic-offline-freetext/reports_by_freetext');
    const getByStartsWithFreetext = queryDocUuidsByRange(medicDb, 'medic-offline-freetext/reports_by_freetext');

    const getDocsFnForFreetextType = (
      qualifier: FreetextQualifier
    ): (limit: number, skip: number) => Promise<string[]> => {
      if (isKeyedFreetextQualifier(qualifier)) {
        return (limit, skip) => getByExactMatchFreetext([ normalizeFreetext(qualifier.freetext) ], limit, skip);
      }
      return (limit, skip) => getByStartsWithFreetext(
        [ normalizeFreetext(qualifier.freetext) ],
        [ normalizeFreetext(qualifier.freetext) + END_OF_ALPHABET_MARKER ],
        limit,
        skip
      );
    };

    const callOnlineQueryNouveauFn = (
      qualifier: FreetextQualifier,
      limit: number,
      cursor: Nullable<string>
    ) => {
      const viewName = 'reports_by_freetext';
      let params: QueryParams;

      if (isKeyedFreetextQualifier(qualifier)) {
        params = {
          key: [qualifier.freetext],
          limit,
          cursor
        };
      } else {
        params = {
          startKey: [qualifier.freetext],
          limit,
          cursor
        };
      }

      return queryNouveauIndexUuids(medicDb, viewName)(params);
    };

    return async (
      qualifier: FreetextQualifier,
      cursor: Nullable<string>,
      limit: number
    ): Promise<Page<string>> => {
      // placing this check inside the curried function because the offline state might change at runtime
      const offline = await isOffline(medicDb);
      if (offline) {
        const skip = validateCursor(cursor);
        const getDocsFn = getDocsFnForFreetextType(qualifier);

        return await fetchAndFilterUuids(getDocsFn, limit)(limit, skip);
      }

      return callOnlineQueryNouveauFn(qualifier, limit, cursor);
    };
  };

  /** @internal*/
  const ensureFormFieldValidity = async (
    medicDb: PouchDB.Database<Doc>,
    input: Record<string, unknown>
  ): Promise<void> => {
    const allowedFormIds = await queryDocUuidsByKey(medicDb, 'medic-client/doc_by_type')([ 'form' ], 1e6, 0);
    const isValidFormType = allowedFormIds.some((id: string) => {
      const expectedID = id.substring(5);
      return expectedID === input.form;
    });
    if (!isValidFormType) {
      throw new InvalidArgumentError('Invalid `form` value');
    }
  };

  /** @internal*/
  export const create = ({
    medicDb
  }: LocalDataContext) => {
    const createReportDoc = createDoc(medicDb);
    const getReportDoc = getDocById(medicDb);
    const appendContact = async (
      input: Input.v1.ReportInput
    ): Promise<Input.v1.ReportInput> => {
      const contactDehydratedLineage = await getReportDoc(input.contact);
      if (contactDehydratedLineage === null) {
        throw new InvalidArgumentError(
          `Contact with _id ${input.contact} does not exist.`
        );
      }
      input = addParentToInput(input, 'contact', contactDehydratedLineage);
      return input;
    };

    return async (input: Input.v1.ReportInput): Promise<Report.v1.Report> => {
      input = Input.v1.validateReportInput(input);
      if (hasField(input, { name: '_rev', type: 'string', ensureTruthyValue: true })) {
        throw new InvalidArgumentError('Cannot pass `_rev` when creating a report.');
      }
      await ensureFormFieldValidity(medicDb, input);
      input = await appendContact(input);
      input = { ...input, type: 'data_record' };
      return await createReportDoc(input) as Report.v1.Report;
    };
  };


  /** @internal*/
  const validateReportUpdatePayload = (
    originalDoc: Doc,
    reportInput: Record<string, unknown>
  ) => {
    const immutableRequiredFields = new Set([ '_rev', '_id', 'reported_date', 'contact', 'type' ]);
    const mutableRequiredFields = new Set([ 'form' ]);
    ensureHasRequiredFields(immutableRequiredFields, mutableRequiredFields, originalDoc, reportInput);
    ensureImmutability(immutableRequiredFields, originalDoc, reportInput);
    // Now it is safe to assign reportInput.contact as the original doc's
    // dehydrated contact lineage as the hierarchy is verified.
    reportInput.contact = originalDoc.contact;
  };

  /** @internal*/
  export const update = ({
    medicDb, settings
  }: LocalDataContext) => {
    const updateReport = updateDoc(medicDb);
    const getReport = get({ medicDb, settings } as LocalDataContext);

    return async (reportInput: Record<string, unknown>): Promise<Report.v1.Report> => {
      if (!isDoc(reportInput)) {
        throw new InvalidArgumentError(`Document for update is not a valid Doc ${JSON.stringify(reportInput)}`);
      }
      const originalReportDoc = await getReport({ uuid: reportInput._id });
      if (originalReportDoc === null) {
        throw new InvalidArgumentError(`Report not found`);
      }
      if (reportInput._rev !== originalReportDoc._rev) {
        throw new InvalidArgumentError('`_rev` does not match');
      }
      validateReportUpdatePayload(originalReportDoc, reportInput);
      await ensureFormFieldValidity(medicDb, reportInput);

      return await updateReport(reportInput) as Report.v1.Report;
    };
  };
}
