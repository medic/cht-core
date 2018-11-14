const _ = require('underscore'),
  vm = require('vm'),
  db = require('../db-nano'),
  moment = require('moment'),
  config = require('../config'),
  taskUtils = require('task-utils'),
  registrationUtils = require('@shared-libs/registration-utils'),
  logger = require('./logger');

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
const getLocale = doc => {
  return (
    doc.locale ||
    (doc.sms_message && doc.sms_message.locale) ||
    config.get('locale_outgoing') ||
    config.get('locale') ||
    'en'
  );
};

const getClinicID = doc => {
  const f = getClinic(doc);
  return f && f._id;
};

const getParent = (facility, type) => {
  while (facility && facility.type !== type) {
    facility = facility.parent;
  }
  return facility;
};

const getClinic = doc => {
  return doc && getParent(doc.contact, 'clinic');
};

const getHealthCenter = doc => {
  return doc && getParent(doc.contact, 'health_center');
};

const getDistrict = doc => {
  return doc && getParent(doc.contact, 'district_hospital');
};

const getHealthCenterPhone = doc => {
  const f = getHealthCenter(doc);
  return f && f.contact && f.contact.phone;
};

const getDistrictPhone = doc => {
  const f = getDistrict(doc);
  return f && f.contact && f.contact.phone;
};

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
    if (doc.errors.hasOwnProperty(i)) {
      const e = doc.errors[i];
      if (error.code === e.code) {
        return;
      }
    }
  }
  doc.errors = doc.errors || [];
  doc.errors.push(error);
};

const getReportsWithSameClinicAndForm = (options, callback) => {
  options = options || {};
  const formName = options.formName,
    clinicId = getClinicID(options.doc);

  if (!formName) {
    return callback('Missing required argument `formName` for match query.');
  }
  if (!clinicId) {
    return callback('Missing required argument `clinicId` for match query.');
  }

  db.medic.view(
    'medic',
    'reports_by_form_and_clinic',
    {
      startkey: [formName, clinicId],
      endkey: [formName, clinicId],
      include_docs: true,
    },
    (err, data) => {
      if (err) {
        return callback(err);
      }
      callback(null, data.rows);
    }
  );
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
  return new Promise((resolve, reject) => {
    db.medic.view('medic-client', 'reports_by_date', options, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.rows.map(row => row.doc));
      }
    });
  });
};

/*
 * Return the value on an object/doc defined by a string.  Support dot notation
 * so the schedule `start_from` configuration can support nested properties.
 */
const getVal = (obj, path) => {
  const arrayRegex = /\[([0-9]*)\]/;
  if (typeof path !== 'string') {
    return;
  }
  path = path.split('.');
  while (obj && path.length) {
    let part = path.shift();
    if (arrayRegex.test(part)) {
      // property with array index
      const index = arrayRegex.exec(part)[1];
      part = part.replace(arrayRegex, '');
      obj = obj[part][index];
    } else {
      // property without array index
      obj = obj[part];
    }
  }
  return obj;
};

const getPatient = (db, patientShortcodeId, includeDocs, callback) => {
  if (!patientShortcodeId) {
    return callback();
  }
  const viewOpts = {
    key: ['shortcode', patientShortcodeId],
    include_docs: includeDocs,
  };
  db.medic.view(
    'medic-client',
    'contacts_by_reference',
    viewOpts,
    (err, results) => {
      if (err) {
        return callback(err);
      }

      if (!results.rows.length) {
        return callback();
      }

      if (results.rows.length > 1) {
        logger.warn(
          `More than one patient person document for shortcode ${patientShortcodeId}`
        );
      }

      const patient = results.rows[0];
      const result = includeDocs ? patient.doc : patient.id;
      return callback(null, result);
    }
  );
};

module.exports = {
  getVal: getVal,
  getLocale: getLocale,
  getClinicPhone: doc => {
    const clinic = getClinic(doc);
    return (
      (clinic && clinic.contact && clinic.contact.phone) ||
      (doc.contact && doc.contact.phone)
    );
  },
  getClinicID: getClinicID,
  getClinic: getClinic,
  getHealthCenter: getHealthCenter,
  getDistrict: getDistrict,
  getHealthCenterPhone: getHealthCenterPhone,
  getDistrictPhone: getDistrictPhone,
  addError: addError,
  getReportsWithinTimeWindow: getReportsWithinTimeWindow,
  getReportsWithSameClinicAndForm: getReportsWithSameClinicAndForm,
  setTaskState: taskUtils.setTaskState,
  setTasksStates: setTasksStates,
  /*
  * Gets registration documents for the given ids
  *
  * NB: Not all ids have registration documents against them, and so this
  *     is not a valid way of determining if the patient with that id exists
  */
  getRegistrations: (options, callback) => {
    const viewOptions = {
      include_docs: true,
    };
    if (options.id) {
      viewOptions.key = options.id;
    } else if (options.ids) {
      viewOptions.keys = options.ids;
    } else {
      return callback(null, []);
    }
    options.db.medic.view(
      'medic-client',
      'registered_patients',
      viewOptions,
      (err, data) => {
        if (err) {
          return callback(err);
        }
        callback(
          null,
          data.rows
            .map(row => row.doc)
            .filter(doc =>
              registrationUtils.isValidRegistration(doc, config.getAll())
            )
        );
      }
    );
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
      viewOptions.key = [options.id];
    } else if (options.ids) {
      viewOptions.keys = options.ids.map(id => ([id]));
    } else {
      return Promise.resolve([]);
    }

    return options.db.query('medic-client/reports_by_subject', viewOptions).then(result => {
      const reports = result.rows.map(row => row.doc);
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
   * Given a patient "shortcode" (as used in SMS reports), return the _id
   * of the patient's person contact to the caller
   */
  getPatientContactUuid: (db, patientShortcodeId, callback) => {
    getPatient(db, patientShortcodeId, false, callback);
  },
  /*
   * Given a patient "shortcode" (as used in SMS reports), return the
   * patient's person record
   */
  getPatientContact: (db, patientShortcodeId, callback) => {
    getPatient(db, patientShortcodeId, true, callback);
  },
  isNonEmptyString: expr => typeof expr === 'string' && expr.trim() !== '',
  evalExpression: (expr, context) => vm.runInNewContext(expr, context),
};
