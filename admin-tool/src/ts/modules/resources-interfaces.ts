/**
 * Represents the resources document as stored in CouchDB.
 * Contains a map of icon names to attachment filenames and the attachments themselves.
 * Used to resolve and render icons associated with form documents.
 */
export interface ResourcesDoc {
  _id: string;
  resources: Record<string, string>;
  _attachments: Record<string, ResourceAttachment>;
  _rev?: string;
}

/**
 * Represents a single icon attachment in the resources document.
 * content_type determines how the icon is rendered — SVG inline or PNG as data URI.
 * data is only present when the document is fetched with attachments: true.
 */
export interface ResourceAttachment {
  content_type: string;
  data?: string;
}
