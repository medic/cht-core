var _ = require('underscore'),
    uuid = require('uuid'),
    moment = require('moment'),
    gsm = require('gsm'),
    phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance(),
    config = require('../config');

var SMS_TRUNCATION_SUFFIX = '...';

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
var getLocale = function(doc) {
    return  doc.locale ||
            (doc.sms_message && doc.sms_message.locale) ||
            config.get('locale_outgoing') ||
            config.get('locale') ||
            'en';
};

var getClinicID = function(doc) {
    var f = getClinic(doc);
    return f && f._id;
};

var getParent = function(facility, type) {
    while (facility && facility.type !== type) {
        facility = facility.parent;
    }
    return facility;
};

var getClinic = function(doc) {
    return doc && getParent(doc.contact, 'clinic');
};

var getHealthCenter = function(doc) {
    return doc && getParent(doc.contact, 'health_center');
};

var getDistrict = function(doc) {
    return doc && getParent(doc.contact, 'district_hospital');
};

var getHealthCenterPhone = function(doc) {
    var f = getHealthCenter(doc);
    return f && f.contact && f.contact.phone;
};

var getDistrictPhone = function(doc) {
    var f = getDistrict(doc);
    return f && f.contact && f.contact.phone;
};

var getSMSPartLimit = function() {
  return config.get('multipart_sms_limit') || 10;
};

var truncateMessage = function(parts, max) {
    var message = parts.slice(0, max).join('');
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
var applyPhoneFilters = function(_config, _phone)  {
    if (!_phone) {
        return _phone;
    }
    var replacement = _config.get('outgoing_phone_replace');
    if (replacement && replacement.match) {
        var match = replacement.match,
            replace = replacement.replace || '';
        if (_phone.indexOf(match) === 0) {
            _phone = replace + _phone.substring(match.length);
        }
    }
    var filters = _config.get('outgoing_phone_filters') || [];
    _.each(filters, function(filter) {
        // only supporting match and replace options for now
        if (filter && filter.match && filter.replace ) {
            _phone = _phone.replace(
                new RegExp(filter.match), filter.replace
            );
        }
    });
    return _phone;
};

var setTaskState = function(task, state) {
    task.state = state;
    task.state_history = task.state_history || [];
    task.state_history.push({
        state: state,
        timestamp: moment().toISOString()
    });
};

var setTasksStates = function(doc, state, predicate) {
    doc.scheduled_tasks = doc.scheduled_tasks || [];
    _.each(doc.scheduled_tasks, function(task) {
        if (predicate.call(this, task)) {
            setTaskState(task, state);
        }
    });
};

var createTaskMessages = function(options) {
    var result = {
        to: applyPhoneFilters(config, options.phone),
        uuid: uuid.v4()
    };
    var parsed = gsm(options.message);
    var max = getSMSPartLimit();

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

var addMessage = function(doc, options) {
    options = options || {};

    _.defaults(doc, {
        tasks: []
    });

    if (!options.message) {
        return;
    }

    var task = _.omit(options, 'message', 'phone', 'uuid', 'state');
    _.extend(task, { messages: createTaskMessages(options) });
    setTaskState(task, options.state || 'pending');
    doc.tasks.push(task);
};

var addError = function(doc, error) {
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
    for (var i in doc.errors) {
        if (doc.errors.hasOwnProperty(i)) {
            var e = doc.errors[i];
            if (error.code === e.code) {
                return;
            }
        }
    }
    doc.errors = doc.errors || [];
    doc.errors.push(error);
};

var getRecentForm = function(options, callback) {
    options = options || {};
    var db = require('../db'),
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
        function(err, data) {
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
var getVal = function(obj, path) {
    var arrayRegex = /\[([0-9]*)\]/;
    if (typeof path !== 'string') {
        return;
    }
    path = path.split('.');
    while (obj && path.length) {
        var part = path.shift();
        if (arrayRegex.test(part)) {
            // property with array index
            var index = arrayRegex.exec(part)[1];
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
    getClinicPhone: function(doc) {
        var clinic = getClinic(doc);
        return (clinic && clinic.contact && clinic.contact.phone) ||
               (doc.contact && doc.contact.phone);
    },
    getClinicName: function(doc, noDefault) {
        var clinic = getClinic(doc);
        var name = (clinic && clinic.name) ||
                   (doc && doc.name);
        if (name || noDefault) {
            return name;
        }
        return 'health volunteer';
    },
    getClinicContactName: function(doc, noDefault) {
        var clinic = getClinic(doc);
        var name = (clinic && clinic.contact && clinic.contact.name) ||
                   (doc && doc.contact && doc.contact.name);
        if (name || noDefault) {
            return name;
        }
        return 'health volunteer';
    },
    /*
     * type can be array or string
     */
    filterScheduledMessages: function(doc, type) {
        var scheduled_tasks = doc && doc.scheduled_tasks;
        return _.filter(scheduled_tasks, function(task) {
            if (_.isArray(type)) {
                return type.indexOf(task.type) >= 0;
            }
            return task.type === type;
        });
    },
    findScheduledMessage: function(doc, type) {
        return _.first(module.exports.filterScheduledMessages(doc, type));
    },
    updateScheduledMessage: function(doc, options) {
        if (!options || !options.message || !options.type) {
            return;
        }
        var msg = _.find(doc.scheduled_tasks, function(task) {
            return task.type === options.type;
        });
        if (msg && msg.messages) {
            _.first(msg.messages).message = options.message;
        }
    },
    addScheduledMessage: function(doc, options) {
        options = options || {};
        var self = module.exports;

        if (options.due instanceof Date) {
            options.due = options.due.getTime();
        }

        var task = _.omit(options, 'message', 'phone');
        task.messages = createTaskMessages(options);

        if (!self.isOutgoingAllowed(doc.from)) {
            setTaskState(task, 'denied');
        } else {
            setTaskState(task, 'scheduled');
        }

        doc.scheduled_tasks = doc.scheduled_tasks || [];
        doc.scheduled_tasks.push(task);
    },
    clearScheduledMessages: function(doc, types) {
        setTasksStates(doc, 'cleared', function(task) {
            return _.contains(types, task.type);
        });
        return doc.scheduled_tasks;
    },
    unmuteScheduledMessages: function(doc) {
        setTasksStates(doc, 'scheduled', function(task) {
            return task.state === 'muted';
        });
        doc.scheduled_tasks = _.filter(doc.scheduled_tasks, function(task) {
            return new Date(task.due) > Date.now();
        });
    },
    muteScheduledMessages: function(doc) {
        setTasksStates(doc, 'muted', function(task) {
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
    updateable: function(a, b) {
        return a._rev === b._rev && !_.isEqual(
            _.omit(a, '_rev', 'transitions'),
            _.omit(b, '_rev', 'transitions')
        );
    },
    /*
     * Returns the first document matching the supplied id in the `patient_id`
     * field.  Optionally matches a form also.
     */
    getRegistrations: function(options, callback) {
        var db = options.db,
            id = options.id,
            form = options.form;

        db.medic.view('medic', 'registered_patients', {
            key: String(id),
            include_docs: true
        }, function(err, data) {
            if (err) {
                return callback(err);
            }
            var docs = data.rows;
            if (form) {
                docs = _.filter(docs, function(row) {
                    return row.doc.form === form;
                });
            }
            callback(null, docs);
        });
    },
    getForm: function(form_code) {
        var forms = config.get('forms');
        return forms && forms[form_code];
    },
    isFormCodeSame: function(form_code, test) {
        // case insensitive match with junk padding
        return (new RegExp('^\W*' + form_code + '\\W*$','i')).test(test);
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
    translate: function(key, locale) {
        var translations = config.getTranslations();
        var msg = (translations[locale] && translations[locale][key]) ||
                  (translations.en && translations.en[key]) ||
                  key;
        return msg.trim();
    },
    escapeRegex: function(s) {
        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
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
    isOutgoingAllowed: function(from) {
        var self = module.exports,
            conf = config.get('outgoing_deny_list') || '';
        if (!from) {
            return true;
        }
        if (self._isMessageFromGateway(from)) {
            return false;
        }
        return _.every(conf.split(','), function(s) {
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
    getPatientContactUuid: function(db, patientShortcodeId, callback) {
        db.medic.view('medic', 'patient_by_patient_shortcode_id',
            {
                key: patientShortcodeId
            },
            function(err, results) {
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
     * Used to avoid infinite loops of auto-reply messages between gateway and
     * itself.
     */
    _isMessageFromGateway: function(from) {
        var gw = config.get('gateway_number');
        if (typeof gw === 'string' && typeof from === 'string') {
            return phoneUtil.isNumberMatch(gw, from) >= 3;
        }
        return false;
    }

};
