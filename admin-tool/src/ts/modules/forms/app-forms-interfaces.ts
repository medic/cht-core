/**
 * Represents a form document as stored in CouchDB.
 * Documents are identified by the prefix 'form:' followed by the internalId.
 * Example: 'form:pregnancy', 'form:death_report'.
 */
export interface FormDoc {
  _id: string;
  type: string;
  internalId: string;
  _rev?: string;
  title?: string;
  icon?: string;
  translation_key?: string;
  context?: FormContext;
  xmlVersion?: FormXmlVersion;
  _attachments?: Record<string, FormAttachment>;
}

/**
 * Defines when and to whom a form is shown in the CHT mobile app.
 * Comes from the JSON meta file uploaded alongside the XML.
 */
export interface FormContext {
  person?: boolean;
  place?: boolean;
  expression?: string;
  user_roles?: string[];
}

/**
 * Tracks the version of the XML file uploaded for a form.
 * time is a Unix timestamp in milliseconds of when the upload occurred.
 * sha256 is the hash of the XML content for change detection.
 */
export interface FormXmlVersion {
  time: number;
  sha256: string;
}

/**
 * Represents a CouchDB attachment on a form document.
 * Used when fetching an existing form doc with attachments: true.
 */
export interface FormAttachment {
  content_type: string;
  data?: string;
}
