/**
 * Represents a translation document as stored in CouchDB.
 * Documents are identified by the prefix 'messages-' followed by the language code.
 * Example: 'messages-en', 'messages-es'.
 */
export interface LanguageDoc {
  _id: string;
  _rev?: string;
  code: string;
  name: string;
  type: string;
  rtl?: boolean;
  generic: Record<string, string>;
  custom?: Record<string, string>;
}

/**
 * UI model for a language entry in the accordion list.
 * Combines the translation document with the enabled state
 * from settings.languages and the count of missing translations.
 */
export interface LanguageModel {
  doc: LanguageDoc;
  enabled: boolean;
  missing: number;
}

/**
 * Validation errors for the add/edit language form fields.
 * Used to display field-level error messages below the inputs.
 */
export interface LanguageValidation {
  code?: string;
  name?: string;
}
