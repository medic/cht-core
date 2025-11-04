import { isOffline, LocalDataContext } from './libs/data-context';
import {
  fetchAndFilterUuids,
  getDocById,
  queryDocUuidsByKey,
  queryDocUuidsByRange,
  queryNouveauIndexUuids,
  createDoc,
  updateDoc
} from './libs/doc';
import { FreetextQualifier, UuidQualifier, isKeyedFreetextQualifier, ReportQualifier } from '../qualifier';
import { Nullable, Page} from '../libs/core';
import * as Report from '../report';
import { Doc } from '../libs/doc';
import logger from '@medic/logger';
import { normalizeFreetext, QueryParams, validateCursor } from './libs/core';
import { END_OF_ALPHABET_MARKER } from '../libs/constants';
import { fetchHydratedDoc } from './libs/lineage';
import { InvalidArgumentError, NotFoundError } from '../libs/error';

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

  /**
   * Validates that a form exists in the database by checking for form documents.
   * @param medicDb the PouchDB database
   * @param formName the form name to validate
   * @returns Promise that resolves if valid, rejects with error if invalid
   * @internal
   */
  const isValidForm = async (
    medicDb: PouchDB.Database<Doc>,
    formName: string
  ): Promise<void> => {
    const allowedFormIds = await queryDocUuidsByKey(medicDb, 'medic-client/doc_by_type')(['form'], 1e6, 0);
    const isValidFormType = allowedFormIds.some((id: string) => {
      const expectedID = id.substring(5); // Remove 'form:' prefix
      return expectedID === formName;
    });
    if (!isValidFormType) {
      throw new InvalidArgumentError(`Invalid form [${formName}]. Form does not exist in database.`);
    }
  };

  /**
   * Converts reported_date to Unix timestamp in milliseconds.
   * @param reportedDate the reported date as string or number
   * @returns Unix timestamp in milliseconds
   * @internal
   */
  const normalizeReportedDate = (reportedDate: string | number): number => {
    if (typeof reportedDate === 'number') {
      return reportedDate;
    }
    const timestamp = new Date(reportedDate).getTime();
    if (isNaN(timestamp)) {
      throw new InvalidArgumentError(
        `Invalid reported_date [${reportedDate}]. Must be a valid date string or timestamp.`
      );
    }
    return timestamp;
  };

  /**
   * Validates that a document exists in the database.
   * @param medicDb the PouchDB database
   * @param uuid the document UUID to validate
   * @param fieldName the field name for error messaging (e.g., "Contact", "Patient", "Place")
   * @throws InvalidArgumentError if document does not exist
   * @internal
   */
  const validateDocumentExists = async (
    medicDb: PouchDB.Database<Doc>,
    uuid: string,
    fieldName: string
  ): Promise<void> => {
    const getDocByIdInner = getDocById(medicDb);
    const doc = await getDocByIdInner(uuid);

    if (!doc) {
      throw new InvalidArgumentError(`${fieldName} document [${uuid}] not found.`);
    }
  };

  /**
   * Hydrates contact field with parent lineage from a UUID string.
   * @param medicDb the PouchDB database
   * @param contactUuid the contact UUID string
   * @returns hydrated contact object with parent lineage or undefined
   * @internal
   */
  const hydrateContact = async (
    medicDb: PouchDB.Database<Doc>,
    contactUuid?: string
  ): Promise<Record<string, unknown> | undefined> => {
    if (!contactUuid) {
      return undefined;
    }

    const fetchHydratedMedicDoc = fetchHydratedDoc(medicDb);
    const hydratedContact = await fetchHydratedMedicDoc(contactUuid);

    if (!hydratedContact) {
      throw new InvalidArgumentError(`Contact with UUID [${contactUuid}] not found.`);
    }

    // Extract only _id and parent lineage
    const minifyLineage = (doc: Record<string, unknown>): Record<string, unknown> => {
      const result: Record<string, unknown> = { _id: doc._id };
      if (doc.parent && typeof doc.parent === 'object') {
        result.parent = minifyLineage(doc.parent as Record<string, unknown>);
      }
      return result;
    };

    return minifyLineage(hydratedContact as Record<string, unknown>);
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
      limit:  number
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

  /** @internal */
  export const create = ({ medicDb }: LocalDataContext) => {
    const createMedicDoc = createDoc(medicDb);
    return async (qualifier: ReportQualifier): Promise<Report.v1.Report> => {
      // Validate report type
      if (qualifier.type !== 'data_record') {
        throw new InvalidArgumentError(`Invalid report type [${qualifier.type}]. Reports must have type 'data_record'.`);
      }

      // Validate form exists in database
      await isValidForm(medicDb, qualifier.form);

      // Validate that _rev is not provided for create
      if ('_rev' in qualifier && qualifier._rev) {
        throw new InvalidArgumentError('_rev is not allowed for create operations.');
      }

      // Normalize reported_date to Unix timestamp
      const reported_date = normalizeReportedDate(qualifier.reported_date);

      // Validate and hydrate contact with parent lineage if provided
      let contact;
      if (qualifier.contact) {
        if (typeof qualifier.contact === 'string') {
          // Contact is a UUID, need to hydrate it
          contact = await hydrateContact(medicDb, qualifier.contact);
        } else if (typeof qualifier.contact === 'object') {
          // Contact is an object
          const contactObj = qualifier.contact as Record<string, unknown>;
          const contactId = contactObj._id as string;
          // Only validate if it's a minimal object (just _id), not a fully hydrated one
          if (contactId && Object.keys(contactObj).length === 1) {
            await validateDocumentExists(medicDb, contactId, 'Contact');
          }
          contact = qualifier.contact;
        } else {
          throw new InvalidArgumentError(
            `contact must be a string UUID or object, received ${typeof qualifier.contact}.`
          );
        }
      }

      // Validate patient reference if provided
      if ('patient' in qualifier && qualifier.patient) {
        const patient = qualifier.patient as string | Record<string, unknown>;
        if (typeof patient === 'string') {
          await validateDocumentExists(medicDb, patient, 'Patient');
        } else if (typeof patient === 'object') {
          const patientObj = patient as Record<string, unknown>;
          const patientId = patientObj._id as string;
          // Only validate if it's a minimal object (just _id), not a fully hydrated one
          if (patientId && Object.keys(patientObj).length === 1) {
            await validateDocumentExists(medicDb, patientId, 'Patient');
          }
        }
      }

      // Validate place reference if provided
      if ('place' in qualifier && qualifier.place) {
        const place = qualifier.place as string | Record<string, unknown>;
        if (typeof place === 'string') {
          await validateDocumentExists(medicDb, place, 'Place');
        } else if (typeof place === 'object') {
          const placeObj = place as Record<string, unknown>;
          const placeId = placeObj._id as string;
          // Only validate if it's a minimal object (just _id), not a fully hydrated one
          if (placeId && Object.keys(placeObj).length === 1) {
            await validateDocumentExists(medicDb, placeId, 'Place');
          }
        }
      }

      const docToCreate = {
        ...qualifier,
        reported_date,
        ...(contact && { contact }),
      };

      const createdDoc = await createMedicDoc(docToCreate as Omit<Doc, '_rev'>);

      if (!isReport(createdDoc)) {
        throw new Error(`Created document [${createdDoc._id}] is not a valid report.`);
      }

      return createdDoc;
    };
  };

  /** @internal */
  export const update = ({ medicDb }: LocalDataContext) => {
    const updateMedicDoc = updateDoc(medicDb);
    return async (qualifier: ReportQualifier): Promise<Report.v1.Report> => {
      // Validate form exists in database
      await isValidForm(medicDb, qualifier.form);

      // Validate that _id is provided for update
      if (!qualifier._id) {
        throw new InvalidArgumentError('_id is required for update operations.');
      }

      // Validate that _rev is provided for update
      if (!qualifier._rev) {
        throw new InvalidArgumentError('_rev is required for update operations.');
      }

      // Fetch existing document to validate immutable fields
      const getMedicDocById = getDocById(medicDb);
      const existingDoc = await getMedicDocById(qualifier._id);
      if (!existingDoc) {
        throw new NotFoundError(`Document [${qualifier._id}] not found.`);
      }

      // Helper to extract UUID from either string or hydrated object
      const extractUuid = (field: string | Record<string, unknown> | undefined): string | undefined => {
        if (!field) {
          return undefined;
        }
        if (typeof field === 'string') {
          return field;
        }
        if (typeof field === 'object') {
          return field._id as string;
        }
        return undefined;
      };

      // Validate immutable fields haven't changed
      const immutableFields = [
        { name: 'type', current: existingDoc.type, incoming: qualifier.type },
        { name: 'form', current: existingDoc.form, incoming: qualifier.form },
        { name: 'reported_date', current: existingDoc.reported_date, incoming: qualifier.reported_date },
        {
          name: 'contact',
          current: extractUuid(existingDoc.contact as string | Record<string, unknown> | undefined),
          incoming: extractUuid(qualifier.contact)
        },
      ];

      for (const field of immutableFields) {
        if (field.incoming !== undefined && field.current !== field.incoming) {
          throw new InvalidArgumentError(
            `Field [${field.name}] is immutable and cannot be changed. ` +
            `Current value: [${field.current as string}], Attempted value: [${field.incoming as string}].`
          );
        }
      }

      // Normalize reported_date to Unix timestamp
      const reported_date = normalizeReportedDate(qualifier.reported_date);

      // Hydrate contact with parent lineage if provided, or use existing object
      let contact;
      if (qualifier.contact) {
        if (typeof qualifier.contact === 'string') {
          // Contact is a UUID, need to hydrate it
          contact = await hydrateContact(medicDb, qualifier.contact);
        } else if (typeof qualifier.contact === 'object') {
          // Contact is already hydrated, use as-is
          contact = qualifier.contact;
        } else {
          throw new InvalidArgumentError(
            `contact must be a string UUID or object, received ${typeof qualifier.contact}.`
          );
        }
      }

      const docToUpdate = {
        ...qualifier,
        reported_date,
        ...(contact && { contact }),
        _rev: qualifier._rev,
      } as Doc;

      const updatedDoc = await updateMedicDoc(docToUpdate);

      if (!isReport(updatedDoc)) {
        throw new Error(`Updated document [${updatedDoc._id}] is not a valid report.`);
      }

      return updatedDoc;
    };
  };
}
