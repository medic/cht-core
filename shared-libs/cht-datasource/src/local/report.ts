import { isOffline, LocalDataContext } from './libs/data-context';
import {
  createDoc,
  fetchAndFilterUuids,
  getDocById,
  getDocsByIds,
  getDocUuidsByIdRange,
  queryDocUuidsByKey,
  queryDocUuidsByRange,
  queryNouveauIndexUuids,
  updateDoc,
} from './libs/doc';
import { FreetextQualifier, isKeyedFreetextQualifier, UuidQualifier } from '../qualifier';
import { assertHasRequiredField, hasStringFieldWithValue, Nullable, Page } from '../libs/core';
import * as Report from '../report';
import { Doc, isDoc } from '../libs/doc';
import logger from '@medic/logger';
import {
  assertFieldsUnchanged,
  getReportedDateTimestamp,
  normalizeFreetext,
  QueryParams,
  validateCursor,
} from './libs/core';
import { END_OF_ALPHABET_MARKER } from '../libs/constants';
import { InvalidArgumentError, ResourceNotFoundError } from '../libs/error';
import * as Input from '../input';
import { fetchHydratedDoc, getContactIdForUpdate, getUpdatedContact, minifyDoc } from './libs/lineage';
import { assertReportInput } from '../libs/parameter-validators';
import * as LocalContact from './contact';

const FORM_DOC_ID_PREFIX = 'form:';

const getSupportedForms = (medicDb: PouchDB.Database<Doc>) => {
  const getMedicDocUuidsByIdRange = getDocUuidsByIdRange(medicDb);
  return async () => {
    const formDocIds = await getMedicDocUuidsByIdRange(FORM_DOC_ID_PREFIX, `${FORM_DOC_ID_PREFIX}\ufff0`);
    return formDocIds.map(id => id.substring(FORM_DOC_ID_PREFIX.length));
  };
};

/** @internal */
export namespace v1 {
  const isReport = (doc: Nullable<Doc>): doc is Report.v1.Report => {
    if (!isDoc(doc)) {
      return false;
    }
    return doc.type === 'data_record' && hasStringFieldWithValue(doc, 'form');
  };

  /** @internal */
  export const get = ({ medicDb }: LocalDataContext) => {
    const getMedicDocById = getDocById(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<Report.v1.Report>> => {
      const doc = await getMedicDocById(identifier.uuid);

      if (!isReport(doc)) {
        logger.warn(`Document [${identifier.uuid}] is not a valid report.`);
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
      if (!isReport(report)) {
        logger.warn(`Document [${identifier.uuid}] is not a valid report.`);
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
        return (limit, skip) => getByExactMatchFreetext([normalizeFreetext(qualifier.freetext)], limit, skip);
      }
      return (limit, skip) => getByStartsWithFreetext(
        [normalizeFreetext(qualifier.freetext)],
        [normalizeFreetext(qualifier.freetext) + END_OF_ALPHABET_MARKER],
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
  export const create = ({ medicDb, settings }: LocalDataContext) => {
    const createMedicDoc = createDoc(medicDb);
    const getMedicDoc = getDocById(medicDb);
    const minifyLineage = minifyDoc(medicDb);
    const getForms = getSupportedForms(medicDb);

    return async (input: Input.v1.ReportInput): Promise<Report.v1.Report> => {
      assertReportInput(input);
      const [contact, supportedForms] = await Promise.all([
        getMedicDoc(input.contact),
        getForms()
      ]);
      if (!supportedForms.includes(input.form)) {
        throw new InvalidArgumentError(`Invalid form value [${input.form}].`);
      }
      if (!LocalContact.v1.isContact(settings, contact)) {
        throw new InvalidArgumentError(`Contact [${input.contact}] not found.`);
      }

      const reportDoc = minifyLineage({
        ...input,
        contact,
        reported_date: getReportedDateTimestamp(input.reported_date),
        type: 'data_record',
      });
      return createMedicDoc(reportDoc) as Promise<Report.v1.Report>;
    };
  };

  /** @internal*/
  export const update = ({
    medicDb, settings
  }: LocalDataContext) => {
    const getMedicDocsByIds = getDocsByIds(medicDb);
    const getContactForUpdate = getUpdatedContact(settings, medicDb);
    const getForms = getSupportedForms(medicDb);
    const updateMedicDoc = updateDoc(medicDb);
    const minifyMedicDoc = minifyDoc(medicDb);

    return async <T extends Report.v1.Report | Report.v1.ReportWithLineage>(
      updatedReport: Input.v1.UpdateReportInput<T>
    ): Promise<T> => {
      if (!isReport(updatedReport)) {
        throw new InvalidArgumentError('Valid _id, _rev, form, and type fields must be provided.');
      }
      const [originalReport, contactDoc] = await getMedicDocsByIds([
        updatedReport._id,
        getContactIdForUpdate(updatedReport)
      ]);
      if (!isReport(originalReport)) {
        throw new ResourceNotFoundError(`Report record [${updatedReport._id}] not found.`);
      }

      const contact = getContactForUpdate(originalReport, updatedReport, contactDoc);
      if (originalReport.contact && !contact) {
        throw new InvalidArgumentError('A contact is must be provided.');
      }
      assertFieldsUnchanged(originalReport, updatedReport, ['_rev', 'reported_date']);
      if (originalReport.form !== updatedReport.form) {
        assertHasRequiredField(updatedReport, { name: 'form', type: 'string' }, InvalidArgumentError);
        const supportedForms = await getForms();
        if (!supportedForms.includes(updatedReport.form)) {
          throw new InvalidArgumentError(`Invalid form value [${updatedReport.form}].`);
        }
      }

      const updatedReportDoc = {
        ...updatedReport,
        contact,
      };
      const { _rev } = await updateMedicDoc(minifyMedicDoc(updatedReportDoc));
      return { ...updatedReportDoc, _rev };
    };
  };
}
