const _ = require('lodash/core');
const moment = require('moment');
const pupil = require('./pupil/src/pupil');
const messages = require('@medic/message-utils');
const config = require('../../transitions/src/config')
const phoneNumberParser = require('@medic/phone-number');

let db;
let logger = console;
let settings;
let translate;
let inited = false;

const _parseDuration = (duration) => {
  const parts = duration.split(' ');
  return moment.duration(parseInt(parts[0]), parts[1]);
};

const _getIntersection = responses => {
  let ids = responses.pop().rows.map(row => row.id);
  responses.forEach(response => {
    ids = ids.filter(id => _.find(response.rows, { id: id }));
  });
  return ids;
};

const _executeExistsRequest = (options) => {
  return db.medic.query('medic-client/reports_by_freetext', options);
};

const lowerCaseString = obj =>
  typeof obj === 'string' ? obj.toLowerCase() : obj;

const _exists = (doc, fields, options = {}) => {
  if (!fields.length) {
    return Promise.reject('No arguments provided to "exists" validation function');
  }

  const requestOptions = fields.map(field => {
    return { key: [`${field}:${lowerCaseString(doc[field])}`] };
  });
  if (options.additionalFilter) {
    requestOptions.push({ key: [lowerCaseString(options.additionalFilter)] });
  }
  let promiseChain = Promise.resolve([]);
  requestOptions.forEach(options => {
    promiseChain = promiseChain.then((responses) => {
      return _executeExistsRequest(options).then(response => {
        responses.push(response);
        return responses;
      });
    });
  });
  return promiseChain.then(responses => {
    const ids = _getIntersection(responses).filter(id => id !== doc._id);
    if (!ids.length) {
      return false;
    }

    return db.medic.allDocs({ keys: ids, include_docs: true }).then(result => {
      // filter out docs with errors
      const found = result.rows.some(row => {
        const doc = row.doc;
        return (
          (!doc.errors || doc.errors.length === 0) &&
          (!options.startDate || doc.reported_date >= options.startDate)
        );
      });
      return found;
    });
  });
};

const extractErrors = (result, messages, ignores = []) => {
  // wrap single item in array; defaults to empty array
  if (!Array.isArray(ignores)) {
    ignores = [ignores];
  }

  const errors = [];
  Object.keys(result).forEach(key => {
    const valid = result[key];
    if (!valid && !ignores.includes(key)) {
      errors.push({
        code: 'invalid_' + key,
        message: messages[key],
      });
    }
  });
  return errors;
};

const getMessages = (validations, locale) => {
  const validationMessages = {};
  validations.forEach(validation => {
    if (
      validation.property &&
      (validation.message || validation.translation_key)
    ) {
      validationMessages[validation.property] = messages.getMessage(validation, translate, locale);
    }
  });
  return validationMessages;
};

const getRules = (validations) => {
  const rules = {};
  validations.forEach(validation => {
    if (validation.property && validation.rule) {
      rules[validation.property] = validation.rule;
    }
  });
  return rules;
};

const compareDate = (doc, validation, checkAfter = false) => {
  const fields = [...validation.funcArgs];
  try {
    const duration = _parseDuration(fields.pop());
    if (!duration.isValid()) {
      logger.error('date constraint validation: the duration is invalid');
      return Promise.resolve(false);
    }
    const testDate = moment(doc[validation.field]);
    const controlDate = checkAfter ?
      moment(doc.reported_date).add(duration) :
      moment(doc.reported_date).subtract(duration);
    if (!testDate.isValid() || !controlDate.isValid()) {
      logger.error('date constraint validation: the date is invalid');
      return Promise.resolve(false);
    }

    if (checkAfter && testDate.isSameOrAfter(controlDate, 'days')) {
      return Promise.resolve(true);
    }
    if (!checkAfter && testDate.isSameOrBefore(controlDate, 'days')) {
      return Promise.resolve(true);
    }

    logger.error('date constraint validation failed');
    return Promise.resolve(false);
  } catch (err) {
    logger.error('date constraint validation: the date or duration is invalid: %o', err);
    return Promise.resolve(false);
  }
};

module.exports = {
  init: (options) => {
    db = options.db;
    translate = options.translate;
    settings = options.settings || options.config;
    logger = options.logger || logger;

    inited = true;
  },

  // Custom validations in addition to pupil but follows Pupil API
  extra_validations: {
    // Check if fields on a doc are unique in the db, return true if unique false otherwise.
    unique: (doc, validation) => {
      return _exists(doc, validation.funcArgs)
        .catch(err => {
          logger.error('Error running "unique" validation: %o', err);
        })
        .then(result => !result);
    },
    uniquePhone: (doc, validation) => {
      return db.medic
        .query('medic-client/contacts_by_phone', { key: doc[validation.field] })
        .then(results => !(results && results.rows && results.rows.length));
    },
    validPhone: (doc, validation) => {
      return Promise.resolve(true);
      const appSettings = config.getAll();
      const validPhone = phoneNumberParser.validate(appSettings, doc[validation.field]);
      return Promise.resolve(validPhone);
    },
    uniqueWithin: (doc, validation) => {
      const fields = [...validation.funcArgs];
      const duration = _parseDuration(fields.pop());
      const startDate = moment()
        .subtract(duration)
        .valueOf();
      return _exists(doc, fields, { startDate })
        .catch(err => {
          logger.error('Error running "uniqueWithin" validation: %o', err);
        })
        .then(result => !result);
    },
    exists: (doc, validation) => {
      const formName = validation.funcArgs[0];
      const fieldName = validation.funcArgs[1];
      return _exists(doc, [fieldName], { additionalFilter: `form:${formName}` }).catch(err => {
        logger.error('Error running "exists" validation: %o', err);
      });
    },
    // Check if the week is a valid ISO week given a year.
    isISOWeek: (doc, validation) => {
      const weekFieldName = validation.funcArgs[0];
      const yearFieldName = validation.funcArgs[1] || null;
      if (
        !_.has(doc, weekFieldName) ||
        (yearFieldName && !_.has(doc, yearFieldName))
      ) {
        logger.error('isISOWeek validation failed: input field(s) do not exist');
        return Promise.resolve(false);
      }

      const year = yearFieldName ? doc[yearFieldName] : new Date().getFullYear();
      const isValidISOWeek =
        /^\d{1,2}$/.test(doc[weekFieldName]) &&
        /^\d{4}$/.test(year) &&
        doc[weekFieldName] >= 1 &&
        doc[weekFieldName] <=
        moment()
          .year(year)
          .isoWeeksInYear();
      if (isValidISOWeek) {
        return Promise.resolve(true);
      }

      logger.error('isISOWeek validation failed: the number of week is greater than the maximum');
      return Promise.resolve(false);
    },

    isAfter: (doc, validation) => compareDate(doc, validation, true),

    isBefore: (doc, validation) => compareDate(doc, validation, false),
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
  validate: (doc, validations = [], ignores = []) => {
    if (!inited) {
      throw new Error('Validation module not initialized');
    }

    let result = {};
    let errors = [];

    // Modify validation objects that are calling a custom validation
    // function. Add function name and args and append the function name to
    // the property value so pupil.validate() will still work and error
    // messages can be generated.
    const extraValidationKeys = Object.keys(module.exports.extra_validations);
    _.forEach(validations, (config, idx) => {
      let entities;
      try {
        logger.debug(`validation rule ${config.rule}`);
        entities = pupil.parser.parse(pupil.lexer.tokenize(config.rule));
      } catch (e) {
        logger.error('error parsing validation: %o', e);
        return errors.push('Error on pupil validations: ' + JSON.stringify(e));
      }
      _.forEach(entities, (entity) => {
        logger.debug('validation rule entity: %o', entity);
        if (entity.sub && entity.sub.length > 0) {
          _.forEach(entity.sub, (entitySub) => {
            logger.debug(`validation rule entity sub ${entitySub.funcName}`);
            if (extraValidationKeys.includes(entitySub.funcName)) {
              const validation = validations[idx];
              // only update the first time through
              if (!validation.property.includes('_' + entitySub.funcName)) {
                validation.funcName = entitySub.funcName;
                validation.funcArgs = entitySub.funcArgs;
                validation.field = config.property;
                validation.property += '_' + entitySub.funcName;
              }
            }
          });
        }
      });
    });

    // trouble parsing pupil rules
    if (errors.length > 0) {
      return Promise.resolve(errors);
    }

    const attributes = Object.assign({}, doc, doc.fields);

    try {
      result = pupil.validate(getRules(validations), attributes);
    } catch (e) {
      errors.push('Error on pupil validations: ' + JSON.stringify(e));
      return Promise.resolve(errors);
    }

    // Run async/extra validations in series and collect results.
    let promiseChain = Promise.resolve();
    _.forEach(validations, validation => {
      promiseChain = promiseChain.then(() => {
        if (!validation.funcName) {
          return;
        }

        return module.exports.extra_validations[validation.funcName]
          .call(this, attributes, validation)
          .then(res => {
            // Be careful to not to make an invalid pupil result valid,
            // only assign false values. If async result is true then do
            // nothing since default is already true. Fields are valid
            // unless proven otherwise.
            if (res === false) {
              result.results[validation.property] = res;
            }
          });
      });
    });

    return promiseChain.then(() => {
      errors = errors.concat(
        extractErrors(
          result.fields(),
          getMessages(validations, messages.getLocale(settings, doc)),
          ignores
        )
      );

      return errors;
    });
  },
};
