const messageUtils = require('@medic/message-utils');
const pupil = require('./pupil');
const validationUtils = require('./validation_utils');

let db;
let settings;
let translate;
let inited = false;

const extractErrors = (results, ignores, locale) => {
  // wrap single item in array; defaults to empty array
  if (!Array.isArray(ignores)) {
    ignores = [ignores];
  }

  return results
    .filter(result => !result.valid && !ignores.includes(result.validation.property))
    .map(result => {
      const code = 'invalid_' + result.validation.property;
      const message = translateMessage(result.validation, locale);
      return { code, message };
    });
};

const translateMessage = (validation, locale) => {
  if (!validation.message && !validation.translation_key) {
    return;
  }
  return messageUtils.getMessage(validation, translate, locale);
};

module.exports = {
  init: (options) => {
    db = options.db;
    translate = options.translate;
    settings = options.settings || options.config;
    validationUtils.init(db, options.dataContext);

    inited = true;
  },
  /**
   * Validation settings may consist of Pupil.js rules and custom rules.
   * These cannot be combined as part of the same rule.
   *
   * Not OK:
   *  rule: "regex(\d{5}) && unique('patient_id')"
   *
   * OK:
   *  rule: "regex(\d{5}) && max(11111)"
   *
   * If for example you want to validate that patient_id is 5 numbers and it
   * is unique (or some other custom validation) you need to define two
   * validation configs/separate rules in your settings. Example validation
   * settings:
   *
   * [
   *  {
   *   property: "patient_id",
   *   rule: "regex(\d{5})",
   *   message: [{
   *       content: "Patient ID must be 5 numbers.",
   *       locale: "en"
   *   }]
   *  },
   *  {
   *   property: "patient_id",
   *   rule: "unique('patient_id')",
   *   message: [{
   *       content: "Patient ID must be unique.",
   *       locale: "en"
   *   }]
   *  }
   * ]
   *
   * validate() modifies the property value of the second item to
   * `patient_id_unique` so that pupil.validate() still returns a valid
   * result.  Then we process the result once more to extract the custom
   * validation results and error messages.
   *
   * @param {Object} doc The doc to validate
   * @param {Object[]} [validations=[]] Validates to execute.
   * @param {String[]} [ignores=[]] Keys of doc that is always considered valid
   * @returns {Promise} Array of errors if validation failed, empty array otherwise.
   */
  validate: async (doc, validations=[], ignores=[]) => {
    if (!inited) {
      throw new Error('Validation module not initialized');
    }

    try {
      const attributes = Object.assign({}, doc, doc.fields);
      const result = await pupil.validate(validations, attributes);
      const locale = messageUtils.getLocale(settings, doc);
      return extractErrors(result, ignores, locale);
    } catch (e) {
      return ['Error on pupil validations: ' + JSON.stringify(e)];
    }

  },
};
