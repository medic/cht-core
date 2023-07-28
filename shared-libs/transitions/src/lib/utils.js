const _ = require('lodash');
const vm = require('vm');
const db = require('../db');
const moment = require('moment');
const config = require('../config');
const taskUtils = require('@medic/task-utils');
const registrationUtils = require('@medic/registration-utils');
const messageUtils = require('@medic/message-utils');
const logger = require('./logger');
const later = require('later');
const cron = require('cron-validator');

/*
 * Get desired locale
 *
 * First look at doc.locale, this will be set if the form has a locale property
 * being set. The form locale should override other defaults.
 *
 * Next check doc.sms_message.
 *
 * Return 'en' otherwise.
 *
 */
const getLocale = doc => messageUtils.getLocale(config.getAll(), doc);

// updates the states of matching scheduled tasks
// returns the number of updated tasks
const setTasksStates = (doc, state, predicate) => {
  doc.scheduled_tasks = doc.scheduled_tasks || [];
  return _.compact(_.map(doc.scheduled_tasks, task => {
    if (predicate.call(this, task)) {
      return taskUtils.setTaskState(task, state);
    }
  })).length;
};

const addError = (doc, error) => {
  if (!doc || !error) {
    return;
  }
  if (_.isString(error)) {
    error = { code: 'invalid_report', message: error };
  } else if (_.isObject(error)) {
    if (!error.code) {
      // set error code if missing
      error.code = 'invalid_report';
    }
    if (!error.message) {
      // bail if error does not have a message
      return;
    }
  } else {
    // error argument must be a string or object
    return;
  }
  // try to avoid duplicates
  for (const i in doc.errors) {
    if (Object.prototype.hasOwnProperty.call(doc.errors, i)) {
      const e = doc.errors[i];
      if (error.code === e.code) {
        return;
      }
    }
  }
  doc.errors = doc.errors || [];
  doc.errors.push(error);
};

const getReportsWithSameParentAndForm = (options={}) => {
  const formName = options.formName;
  if (!formName) {
    return Promise.reject('Missing required argument `formName` for match query.');
  }

  const parentId = options.doc &&
                   options.doc.contact &&
                   options.doc.contact.parent &&
                   options.doc.contact.parent._id;
  if (!parentId) {
    return Promise.reject('Missing required argument `parentId` for match query.');
  }

  return db.medic.query('medic/reports_by_form_and_parent', {
    startkey: [formName, parentId],
    endkey: [formName, parentId],
    include_docs: true,
    reduce: false,
  }).then(data => data.rows);
};

const getReportsWithinTimeWindow = (
  latestTimestamp,
  timeWindowInDays,
  options = {}
) => {
  const timeWindowInMillis = moment
    .duration({ days: timeWindowInDays })
    .asMilliseconds();
  const startTimestamp = latestTimestamp - timeWindowInMillis;
  _.defaults(options, {
    endkey: [startTimestamp],
    startkey: [latestTimestamp],
    include_docs: true,
    descending: true, // most recent first
  });
  return db.medic.query('medic-client/reports_by_date', options)
    .then(data => data.rows.map(row => row.doc));
};

const getContact = (shortCodeId, includeDocs) => {
  if (!shortCodeId) {
    return Promise.resolve();
  }
  const viewOpts = {
    key: ['shortcode', shortCodeId],
    include_docs: includeDocs,
  };
  return db.medic.query('medic-client/contacts_by_reference', viewOpts).then(results => {
    if (!results.rows.length) {
      return;
    }

    if (results.rows.length > 1) {
      logger.warn(`More than one contact document for shortcode ${shortCodeId}`);
    }

    const contact = results.rows[0];
    return includeDocs ? contact.doc : contact.id;
  });
};

const isWithinTimeBound = (currentTime, dueTime, frame) => {
  const lowerBoundDueTime = dueTime - frame;
  const upperBoundDueTime = dueTime + frame;

  return currentTime >= lowerBoundDueTime && currentTime <= upperBoundDueTime;
};

module.exports = {
  getLocale: getLocale,
  addError: addError,
  getReportsWithinTimeWindow: getReportsWithinTimeWindow,
  getReportsWithSameParentAndForm: getReportsWithSameParentAndForm,
  setTaskState: taskUtils.setTaskState,
  setTasksStates: setTasksStates,
  /*
   * Gets registration documents for the given ids
   *
   * NB: Not all ids have registration documents against them, and so this
   *     is not a valid way of determining if the patient with that id exists
   */
  getRegistrations: (options) => {
    const viewOptions = {
      include_docs: true,
    };
    if (options.id) {
      viewOptions.key = options.id;
    } else if (options.ids) {
      viewOptions.keys = options.ids;
    } else {
      return Promise.resolve([]);
    }
    return db.medic
      .query('medic-client/registered_patients', viewOptions)
      .then(data => {
        return data.rows
          .map(row => row.doc)
          .filter(doc => registrationUtils.isValidRegistration(doc, config.getAll()));
      });
  },
  getForm: formCode => {
    const forms = config.get('forms');
    return forms && forms[formCode];
  },
  isFormCodeSame: (formCode, test) => {
    // case insensitive match with junk padding
    return new RegExp('^W*' + formCode + '\\W*$', 'i').test(test);
  },

  getReportsBySubject: (options) => {
    const viewOptions = { include_docs: true };
    if (options.id) {
      viewOptions.key = options.id;
    } else if (options.ids) {
      viewOptions.keys = options.ids;
    } else {
      return Promise.resolve([]);
    }

    return db.medic.query('medic-client/reports_by_subject', viewOptions).then(result => {
      const reports = _.uniqBy(result.rows.map(row => row.doc), '_id');
      if (!options.registrations) {
        return reports;
      }

      return reports.filter(report => registrationUtils.isValidRegistration(report, config.getAll()));
    });
  },

  /*
   * Return message from configured translations given key and locale.
   *
   * If translation is not found return the translation key.  Otherwise
   * messages won't get added because of an empty message.  Better to at
   * least surface something in the UI providing a clue that something is
   * misconfigured as opposed to broken.
   *
   * @param {String} key - translation key/identifier
   * @param {String} locale - short locale string
   *
   * @returns {String|undefined} - the translated message
   */
  translate: (key, locale) => {
    const translations = config.getTranslations();
    const msg =
      (translations[locale] && translations[locale][key]) ||
      (translations.en && translations.en[key]) ||
      key;
    return msg && msg.trim();
  },
  /*
   * Given a contact "shortcode" (as used in SMS reports), return the _id
   * of the contact to the caller
   */
  getContactUuid: (shortCodeId) => {
    return getContact(shortCodeId, false);
  },
  /*
   * Given a contact "shortcode" (as used in SMS reports), return the contact record
   */
  getContact: (shortCodeId) => {
    return getContact(shortCodeId, true);
  },
  isNonEmptyString: expr => typeof expr === 'string' && expr.trim() !== '',
  evalExpression: (expr, context) => vm.runInNewContext(expr, context),

  getSubjectIds: contact => registrationUtils.getSubjectIds(contact),

  isXFormReport: doc => doc && doc.type === 'data_record' && doc.content_type === 'xml',

  /**
   * Validates if a cron expression is valid and is active within an offset timeframe at the current time.
   * @param {string} exp cron expression without seconds "* * * * *"
   * @param {number} frame timeframe at which the cron expression should still be valid
   * @returns true if valid and within timeframe
   */
  isWithinTimeFrame: (exp, frame = 0) => {
    if (!cron.isValidCron(exp)) {
      throw new Error(`Invalid cron expression "${exp}"`);
    }
    
    const currentTime = Date.now();
    const parsedCron = later.parse.cron(exp);
    const nextDueTime = later.schedule(parsedCron).next().getTime();
    const prevDueTime = later.schedule(parsedCron).prev().getTime();

    return isWithinTimeBound(currentTime, nextDueTime, frame) 
        || isWithinTimeBound(currentTime, prevDueTime, frame);
  },

  isValidCronExpression: cron.isValidCron,

  // given a report, returns whether it should be accepted as a valid form submission
  // a report is accepted if
  // - it's an xform
  // - it's an SMS public form
  // - it's an SMS form submitted by a known contact
  isValidSubmission: doc => {
    const form = doc && module.exports.getForm(doc.form);
    return module.exports.isXFormReport(doc) || // xform submission
           (form && form.public_form) || // json submission to public form
           (form && module.exports.hasKnownSender(doc)); // json submission by known submitter
  },
  hasKnownSender: doc => {
    const contact = doc && doc.contact;
    if (!contact) {
      return false;
    }
    return (contact.phone) ||
           (contact.parent && contact.parent.contact && contact.parent.contact.phone);
  }
};
