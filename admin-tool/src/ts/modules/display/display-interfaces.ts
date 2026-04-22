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

/**
 * Represents a single row in the translations side-by-side table.
 * Each row corresponds to one translation key.
 * leftValue is the key itself when Translation Keys mode is active,
 * or the translated value in the left column language.
 * rightValue is the translated value in the right column language,
 * or undefined if the key does not exist in that language.
 */
export interface DisplayTranslationRow {
  key: string;
  leftValue: string;
  rightValue: string | undefined;
}

/**
 * Maps each language code to the translation value for a specific key.
 * Used as the form model in the add/edit translation modal.
 * An empty string means the key has no translation in that language.
 *
 * Example for key 'Submit':
 * {
 *   en: 'Submit',
 *   es: 'Enviar',
 *   fr: ''
 * }
 */
export interface TranslationKeyValues {
  [code: string]: string;
}
