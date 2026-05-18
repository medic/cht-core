import contactTypesUtils from '@medic/contact-types-utils';
import { DOC_TYPES } from '@medic/constants';
import { Nullable } from './core';
import { Doc } from './doc';
import type * as Contact from '../contact';
import type * as Report from '../report';

const SUBJECT_FIELDS = new Set(['patient_id', 'patient_uuid', 'patient_name', 'place_id']);

interface ContactLike {
  readonly _id?: string;
  readonly parent?: ContactLike;
}

interface SubjectError {
  readonly code?: string;
  readonly fields?: readonly string[];
}

interface ReportLike {
  readonly _id?: string;
  readonly _rev?: string;
  readonly form?: string;
  readonly type?: string;
  readonly from?: string;
  readonly sent_by?: string;
  readonly contact?: ContactLike & { phone?: string };
  readonly read?: string[];
  readonly errors?: SubjectError[];
  readonly verified?: boolean;
  readonly reported_date?: number;
  readonly case_id?: string;
  readonly fields?: {
    readonly patient_id?: string;
    readonly patient_uuid?: string;
    readonly patient_name?: string;
    readonly place_id?: string;
    readonly case_id?: string;
  };
  readonly patient_id?: string;
  readonly place_id?: string;
}

interface ContactDocLike {
  readonly _id?: string;
  readonly _rev?: string;
  readonly type?: string;
  readonly contact_type?: string;
  readonly name?: string;
  readonly phone?: string;
  readonly contact?: { _id?: string };
  readonly parent?: ContactLike;
  readonly date_of_death?: number;
  readonly muted?: boolean;
}

/** @internal */
export const getLineage = (contact: Nullable<ContactLike> | undefined): string[] => {
  const parts: string[] = [];
  let current: Nullable<ContactLike> | undefined = contact;
  while (current) {
    if (current._id) {
      parts.push(current._id);
    }
    current = current.parent;
  }
  return parts;
};

const isMissingSubjectError = (error: SubjectError): boolean => {
  return error.code === 'sys.missing_fields'
    && Array.isArray(error.fields)
    && error.fields.some(field => SUBJECT_FIELDS.has(field));
};

const getReference = (doc: ReportLike): string | undefined => {
  return doc.patient_id
    ?? doc.fields?.patient_id
    ?? doc.fields?.patient_uuid
    ?? doc.place_id
    ?? doc.fields?.place_id;
};

/** @internal */
export const getSubject = (doc: ReportLike): Report.v1.ReportSummary['subject'] => {
  const subject: { name?: string; value?: string; type?: string } = {};
  const reference = getReference(doc);
  const patientName = doc.fields?.patient_name;

  if (patientName) {
    subject.name = patientName;
  }

  if (reference) {
    subject.value = reference;
    subject.type = 'reference';
  } else if (patientName) {
    subject.value = patientName;
    subject.type = 'name';
  } else if (doc.errors?.some(error => isMissingSubjectError(error))) {
    subject.type = 'unknown';
  }

  return subject;
};

type ReportDoc = Doc & ReportLike & { readonly form: string };
type ContactDoc = Doc & ContactDocLike & { readonly type: string };

/** @internal */
export const isContact = (doc: Nullable<Doc> | undefined): doc is ContactDoc => {
  const type = (doc as ContactDocLike | null | undefined)?.type;
  if (!type) {
    return false;
  }
  return type === 'contact' || contactTypesUtils.isHardcodedType(type);
};

/** @internal */
export const isReport = (doc: Nullable<Doc> | undefined): doc is ReportDoc => {
  const reportDoc = doc as ReportLike | null | undefined;
  return reportDoc?.type === DOC_TYPES.DATA_RECORD && typeof reportDoc.form === 'string' && !!reportDoc.form;
};

/** @internal */
export const summariseReport = (doc: ReportDoc): Report.v1.ReportSummary => {
  return {
    _id: doc._id,
    _rev: doc._rev,
    from: doc.from ?? doc.sent_by,
    phone: doc.contact?.phone,
    form: doc.form,
    read: doc.read,
    valid: !doc.errors?.length,
    verified: doc.verified,
    reported_date: doc.reported_date,
    contact: doc.contact?._id,
    lineage: getLineage(doc.contact?.parent),
    subject: getSubject(doc),
    case_id: doc.case_id ?? doc.fields?.case_id,
  };
};

/** @internal */
export const summariseContact = (doc: ContactDoc): Contact.v1.ContactSummary => {
  return {
    _id: doc._id,
    _rev: doc._rev,
    name: doc.name ?? doc.phone,
    phone: doc.phone,
    type: doc.type,
    contact_type: doc.contact_type,
    contact: doc.contact?._id,
    lineage: getLineage(doc.parent),
    date_of_death: doc.date_of_death,
    muted: doc.muted,
  };
};

/**
 * Returns a compact summary of the given document, or `undefined` if the document is not a supported
 * record type (contact or report). Inspects `doc.type` to decide whether to produce a contact summary
 * or a report summary.
 * @param doc the document to summarise
 */
export const summarise = (
  doc: Nullable<Doc> | undefined
): Contact.v1.ContactSummary | Report.v1.ReportSummary | undefined => {
  if (!doc) {
    return;
  }

  if (isReport(doc)) {
    return summariseReport(doc);
  }

  if (isContact(doc)) {
    return summariseContact(doc);
  }
};
