import { LocalDataContext } from './libs/data-context';
import {
  createDoc,
  fetchAndFilterIds,
  getDocById, getDocIdsByIdRange, getDocsByIds,
  queryDocIdsByKey,
  queryDocIdsByRange, updateDoc
} from './libs/doc';
import { FreetextQualifier, isKeyedFreetextQualifier, UuidQualifier } from '../qualifier';
import { assertHasRequiredField, hasStringFieldWithValue, Nullable, Page } from '../libs/core';
import * as Report from '../report';
import * as LocalContact from './contact';
import * as Input from '../input';
import { Doc, isDoc } from '../libs/doc';
import logger from '@medic/logger';
import { DOC_TYPES } from '@medic/constants';

import {
  assertFieldsUnchanged,
  getReportedDateTimestamp,
  normalizeFreetextQualifier,
  validateCursor
} from './libs/core';
import { END_OF_ALPHABET_MARKER } from '../libs/constants';
import { fetchHydratedDoc, getContactIdForUpdate, getUpdatedContact, minifyDoc } from './libs/lineage';
import { queryByFreetext, useNouveauIndexes } from './libs/nouveau';
import { InvalidArgumentError, ResourceNotFoundError } from '../libs/error';
import { assertReportInput } from '../libs/parameter-validators';

const FORM_DOC_ID_PREFIX = 'form:';

const getOfflineFreetextQueryFn = (medicDb: PouchDB.Database<Doc>) => {
  const queryViewFreetextByKey = queryDocIdsByKey(medicDb, 'medic-offline-freetext/reports_by_freetext');
  const queryViewFreetextByRange = queryDocIdsByRange(medicDb, 'medic-offline-freetext/reports_by_freetext');

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

const getSupportedForms = (medicDb: PouchDB.Database<Doc>) => {
  const getMedicDocUuidsByIdRange = getDocIdsByIdRange(medicDb);
  return async () => {
    const formDocIds = await getMedicDocUuidsByIdRange(FORM_DOC_ID_PREFIX, `${FORM_DOC_ID_PREFIX}\ufff0`);
    return formDocIds.map(id => id.substring(FORM_DOC_ID_PREFIX.length));
  };
};

const assertUpdatedForm = async <T extends Report.v1.Report | Report.v1.ReportWithLineage>(
  originalReport: Report.v1.Report,
  updatedReport: Input.v1.UpdateReportInput<T>,
  getForms: () => Promise<string[]>
) => {
  if (originalReport.form !== updatedReport.form) {
    assertHasRequiredField(updatedReport, { name: 'form', type: 'string' }, InvalidArgumentError);
    const supportedForms = await getForms();
    if (!supportedForms.includes(updatedReport.form)) {
      throw new InvalidArgumentError(`Invalid form value [${updatedReport.form}].`);
    }
  }
};

/** @internal */
export namespace v1 {
  const isReport = (doc: Nullable<Doc>): doc is Report.v1.Report => {
    if (!isDoc(doc)) {
      return false;
    }
    return doc.type === DOC_TYPES.DATA_RECORD && hasStringFieldWithValue(doc, 'form');
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
      return fetchAndFilterIds(getPageFn, limit)(limit, skip);
    };
  };

  /** @internal*/
  export const create = ({ medicDb, settings }: LocalDataContext) => {
    const createMedicDoc = createDoc(medicDb);
    const getMedicDoc = getDocById(medicDb);
    const minifyMedicDoc = minifyDoc(medicDb);
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

      const reportDoc = minifyMedicDoc({
        ...input,
        contact,
        reported_date: getReportedDateTimestamp(input.reported_date),
        type: DOC_TYPES.DATA_RECORD,
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
        throw new InvalidArgumentError('A contact must be provided.');
      }
      assertFieldsUnchanged(originalReport, updatedReport, ['_rev', 'reported_date']);
      await assertUpdatedForm(originalReport, updatedReport, getForms);

      const updatedReportDoc = {
        ...updatedReport,
        contact,
      };
      const { _rev } = await updateMedicDoc(minifyMedicDoc(updatedReportDoc));
      return { ...updatedReportDoc, _rev };
    };
  };
}
