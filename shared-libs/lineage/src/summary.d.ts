/**
 * A compact summary of a contact record.
 */
export interface ContactSummary {
  readonly _id: string;
  readonly _rev: string;
  readonly name?: string;
  readonly phone?: string;
  readonly type: string;
  readonly contact_type?: string;
  readonly contact?: string;
  readonly lineage: string[];
  readonly date_of_death?: number;
  readonly muted?: boolean;
}

/**
 * A compact summary of a report record.
 */
export interface ReportSummary {
  readonly _id: string;
  readonly _rev: string;
  readonly from?: string;
  readonly phone?: string;
  readonly form: string;
  readonly read?: string[];
  readonly valid: boolean;
  readonly verified?: boolean;
  readonly reported_date?: number;
  readonly contact?: string;
  readonly lineage: string[];
  readonly subject: {
    readonly name?: string;
    readonly value?: string;
    readonly type?: string;
  };
  readonly case_id?: string;
}

/** Returns the array of `_id`s for the given contact and its parent lineage. */
export function getLineage(contact: Record<string, unknown> | null | undefined): string[];

/** Resolves the subject (name/reference) for a report document. */
export function getSubject(doc: Record<string, unknown>): ReportSummary['subject'];

/** Returns `true` if the document is a contact (configurable or hardcoded type). */
export function isContact(doc: Record<string, unknown> | null | undefined): boolean;

/** Returns `true` if the document is a report (a `data_record` with a `form`). */
export function isReport(doc: Record<string, unknown> | null | undefined): boolean;

/** Produces a compact summary of a contact document. */
export function summariseContact(doc: Record<string, unknown>): ContactSummary;

/** Produces a compact summary of a report document. */
export function summariseReport(doc: Record<string, unknown>): ReportSummary;

/**
 * Returns a compact summary of the given document, or `undefined` if the document is not a
 * supported record type (contact or report).
 */
export function summarise(
  doc: Record<string, unknown> | null | undefined
): ContactSummary | ReportSummary | undefined;
