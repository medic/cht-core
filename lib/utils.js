const _ = require('underscore'),
      uuid = require('uuid'),
      moment = require('moment'),
      gsm = require('gsm'),
      phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance(),
      config = require('../config');

const SMS_TRUNCATION_SUFFIX = '...';

/*
 * Get desired locale
 *
 * First look at doc.locale, this will be set if the form has a locale property
 * being set. The form locale should override other defaults.
 *
 * Next check the smssync settings, which is on doc.sms_message.
 *
 * Return 'en' otherwise.
 *
 */
const getLocale = doc => {
  return  doc.locale ||
          (doc.sms_message && doc.sms_message.locale) ||
          config.get('locale_outgoing') ||
          config.get('locale') ||
          'en';
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

const getSMSPartLimit = () => {
  return config.get('multipart_sms_limit') || 10;
};

const truncateMessage = (parts, max) => {
  const message = parts.slice(0, max).join('');
  return message.slice(0, -SMS_TRUNCATION_SUFFIX.length) + SMS_TRUNCATION_SUFFIX;
};

/*
 *
 * Apply phone number filters defined in configuration file.
 *
 * Example:
 *
 * "outgoing_phone_filters": [
 *      {
 *          "match": "\\+997",
 *          "replace": ""
 *      }
 * ]
 */
const applyPhoneFilters = (_config, _phone) => {
  if (!_phone) {
    return _phone;
  }
  const replacement = _config.get('outgoing_phone_replace');
  if (replacement && replacement.match) {
    const match = replacement.match,
      replace = replacement.replace || '';
    if (_phone.indexOf(match) === 0) {
      _phone = replace + _phone.substring(match.length);
    }
  }
  const filters = _config.get('outgoing_phone_filters') || [];
  filters.forEach(filter => {
    // only supporting match and replace options for now
    if (filter && filter.match && filter.replace ) {
      _phone = _phone.replace(
        new RegExp(filter.match), filter.replace
      );
    }
  });
  return _phone;
};

const setTaskState = (task, state) => {
  task.state = state;
  task.state_history = task.state_history || [];
  task.state_history.push({
    state: state,
    timestamp: moment().toISOString()
  });
};

const setTasksStates = (doc, state, predicate) => {
  doc.scheduled_tasks = doc.scheduled_tasks || [];
  _.each(doc.scheduled_tasks, task => {
    if (predicate.call(this, task)) {
      setTaskState(task, state);
    }
  });
};

const createTaskMessages = options => {
  const result = {
    to: applyPhoneFilters(config, options.phone),
    uuid: uuid.v4()
  };
  const parsed = gsm(options.message);
  const max = getSMSPartLimit();

  if (parsed.sms_count <= max) {
    // no need to truncate
    result.message = options.message;
  } else {
    // message too long - truncate
    result.message = truncateMessage(parsed.parts, max);
    result.original_message = options.message;
  }

  return [ result ];
};

const addMessage = (doc, options) => {
  options = options || {};

  _.defaults(doc, {
    tasks: []
  });

  if (!options.message) {
    return;
  }

  const task = _.omit(options, 'message', 'phone', 'uuid', 'state');
  _.extend(task, { messages: createTaskMessages(options) });
  setTaskState(task, options.state || 'pending');
  doc.tasks.push(task);
};

const addError = (doc, error) => {
  if (!doc || !error) {
    return;
  }
  if (_.isString(error)) {
    error = {code: 'invalid_report', message: error};
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

const getRecentForm = (options, callback) => {
  options = options || {};
  const db = require('../db'),
    formName = options.formName,
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
      include_docs: true
    },
    (err, data) => {
      if (err) {
        return callback(err);
      }
      callback(null, data.rows);
    }
  );
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

module.exports = {
  getVal: getVal,
  getLocale: getLocale,
  getClinicPhone: doc => {
    const clinic = getClinic(doc);
    return (clinic && clinic.contact && clinic.contact.phone) ||
           (doc.contact && doc.contact.phone);
  },
  getClinicName: (doc, noDefault) => {
    const clinic = getClinic(doc);
    const name = (clinic && clinic.name) ||
                 (doc && doc.name);
    if (name || noDefault) {
      return name;
    }
    return 'health volunteer';
  },
  getClinicContactName: (doc, noDefault) => {
    const clinic = getClinic(doc);
    const name = (clinic && clinic.contact && clinic.contact.name) ||
                 (doc && doc.contact && doc.contact.name);
    if (name || noDefault) {
      return name;
    }
    return 'health volunteer';
  },
  /*
   * type can be array or string
   */
  filterScheduledMessages: (doc, type) => {
    const scheduled_tasks = doc && doc.scheduled_tasks;
    return _.filter(scheduled_tasks, task => {
      if (_.isArray(type)) {
        return type.indexOf(task.type) >= 0;
      }
      return task.type === type;
    });
  },
  findScheduledMessage: (doc, type) => {
    return _.first(module.exports.filterScheduledMessages(doc, type));
  },
  updateScheduledMessage: (doc, options) => {
    if (!options || !options.message || !options.type) {
      return;
    }
    const msg = _.find(doc.scheduled_tasks, task => {
      return task.type === options.type;
    });
    if (msg && msg.messages) {
      _.first(msg.messages).message = options.message;
    }
  },
  addScheduledMessage: (doc, options) => {
    options = options || {};
    const self = module.exports;

    if (options.due instanceof Date) {
      options.due = options.due.getTime();
    }

    const task = _.omit(options, 'message', 'phone');
    task.messages = createTaskMessages(options);

    if (!self.isOutgoingAllowed(doc.from)) {
      setTaskState(task, 'denied');
    } else {
      setTaskState(task, 'scheduled');
    }

    doc.scheduled_tasks = doc.scheduled_tasks || [];
    doc.scheduled_tasks.push(task);
  },
  clearScheduledMessages: (doc, types) => {
    setTasksStates(doc, 'cleared', task => {
      return _.contains(types, task.type);
    });
    return doc.scheduled_tasks;
  },
  unmuteScheduledMessages: doc => {
    setTasksStates(doc, 'scheduled', task => {
      return task.state === 'muted';
    });
    doc.scheduled_tasks = _.filter(doc.scheduled_tasks, task => {
      return new Date(task.due) > Date.now();
    });
  },
  muteScheduledMessages: doc => {
    setTasksStates(doc, 'muted', task => {
      return task.state === 'scheduled';
    });
  },
  getClinicID: getClinicID,
  getClinic: getClinic,
  getHealthCenter: getHealthCenter,
  getDistrict: getDistrict,
  getHealthCenterPhone: getHealthCenterPhone,
  getDistrictPhone: getDistrictPhone,
  addMessage: addMessage,
  addError: addError,
  getRecentForm: getRecentForm,
  setTaskState: setTaskState,
  setTasksStates: setTasksStates,
  applyPhoneFilters: applyPhoneFilters,
  /*
  * Compares two objects; updateable if _rev is the same
  * and are different barring their `_rev` and `transitions` properties
  */
  updateable: (a, b) => {
    return a._rev === b._rev && !_.isEqual(
      _.omit(a, '_rev', 'transitions'),
      _.omit(b, '_rev', 'transitions')
    );
  },
  /*
  * Gets registration documents for the given ids
  *
  * NB: Not all ids have registration documents against them, and so this
  *     is not a valid way of determining if the patient with that id exists
  */
  getRegistrations: (options, callback) => {
    const db = options.db,
      id = options.id,
      ids = options.ids;

    const viewOptions = {
      include_docs: true
    };

    if (id) {
      viewOptions.key = id;
    }
    if (ids) {
      viewOptions.keys = ids;
    }

    db.medic.view('medic', 'registered_patients', viewOptions, (err, data) => {
      if (err) {
        return callback(err);
      }
      callback(null, data.rows);
    });
  },
  getForm: formCode => {
    const forms = config.get('forms');
    return forms && forms[formCode];
  },
  isFormCodeSame: (formCode, test) => {
    // case insensitive match with junk padding
    return (new RegExp('^\W*' + formCode + '\\W*$','i')).test(test);
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
    const msg = (translations[locale] && translations[locale][key]) ||
          (translations.en && translations.en[key]) ||
          key;
    return msg.trim();
  },
  escapeRegex: string => {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  },
  /*
   * Return false when the recipient phone matches the denied list.
   *
   * outgoing_deny_list is a comma separated list of strings. If a string in
   * that list matches the beginning of the phone then we set up a response
   * with a denied state. The pending message process will ignore these
   * messages and those reports will be left without an auto-reply. The
   * denied messages still show up in the messages export.
   *
   * @param {String} from - Recipient phone number
   * @returns {Boolean}
   */
  isOutgoingAllowed: from => {
    const self = module.exports,
      conf = config.get('outgoing_deny_list') || '';
    if (!from) {
      return true;
    }
    if (self._isMessageFromGateway(from)) {
      return false;
    }
    return _.every(conf.split(','), s => {
      // ignore falsey inputs
      if (!s) {
        return true;
      }
      // return false if we get a case insensitive starts with match
      return from.toLowerCase().indexOf(s.trim().toLowerCase()) !== 0;
    });
  },
  /*
   * Given a patient "shortcode" (as used in SMS reports), return the _id
   * of the patient's person contact to the caller
   */
  getPatientContactUuid: (db, patientShortcodeId, callback) => {
    db.medic.view('medic', 'patient_by_patient_shortcode_id',
      {
        key: patientShortcodeId
      },
      (err, results) => {
        if (err) {
          return callback(err);
        }

        if (!results.rows.length) {
          return callback();
        }

        if (results.rows.length > 1) {
          console.warn('More than one patient person document for shortcode ' + patientShortcodeId);
        }

        return callback(null, results.rows[0].id);
    });
  },
  /*
   * Given a patient "shortcode" (as used in SMS reports), return the
   * patient's person record
   */
  getPatientContact: (db, patientShortcodeId, callback) => {
    db.medic.view('medic', 'patient_by_patient_shortcode_id',
      {
        key: patientShortcodeId,
        include_docs: true
      },
      (err, results) => {
        if (err) {
          return callback(err);
        }

        if (!results.rows.length) {
          return callback();
        }

        if (results.rows.length > 1) {
          console.warn('More than one patient person document for shortcode ' + patientShortcodeId);
        }

        return callback(null, results.rows[0].doc);
    });
  },
  /*
   * Used to avoid infinite loops of auto-reply messages between gateway and
   * itself.
   */
  _isMessageFromGateway: from => {
    const gw = config.get('gateway_number');
    if (typeof gw === 'string' && typeof from === 'string') {
      return phoneUtil.isNumberMatch(gw, from) >= 3;
    }
    return false;
  }

};
