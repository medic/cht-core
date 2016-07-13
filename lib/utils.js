var _ = require('underscore'),
    uuid = require('uuid'),
    moment = require('moment'),
    phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance(),
    template = require('./template'),
    config = require('../config'),
    date = require('../date');

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

var addMessage = function(doc, options) {
    options = options || {};
    var phone = applyPhoneFilters(config, options.phone),
        message = options.message,
        task = _.omit(options, 'message', 'phone', 'uuid', 'state');

    _.defaults(doc, {
        tasks: []
    });

    if (!message) {
        return;
    }

    /* this might fail with ucs2 strings */
    if (message.length > 160) {
        message = message.substr(0,160-3) + '...';
    }

    _.extend(task, {
        messages: [
            {
                to: phone,
                message: message,
                uuid: uuid()
            }
        ]
    });

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
        var e = doc.errors[i];
        if (error.code === e.code) {
            return;
        }
    }
    doc.errors = doc.errors || [];
    doc.errors.push(error);
};

var getOHWRegistration = function(patient_id, callback) {
    var db = require('../db'),
        q;

    q = {
        key: patient_id,
        include_docs: true,
        limit: 1
    };

    db.medic.view('kujua-sentinel', 'ohw_registered_patients', q, function(err, data) {
        if (err) {
            return callback(err);
        }
        var row = _.first(data.rows),
            registration = row && row.doc;

        callback(null, registration);
    });
};

var getOHWMatchingRecords = function(options, callback) {
    options = options || {};
    var db = require('../db'),
        doc = options.doc,
        patient_id = options.patient_id,
        serial_number = options.serial_number,
        time_val = options.time_val,
        time_key = options.time_key,
        clinic_id = getClinicID(doc);

    if (!doc || (!patient_id && !serial_number) || !doc.form) {
        return callback('Missing required argument for match query.');
    }

    var view = 'patient_ids_by_form_clinic_and_reported_date',
        q = {startkey:[], endkey:[], include_docs:true};

    if (serial_number) {
        view = 'serial_numbers_by_form_clinic_and_reported_date';
    }

    q.startkey[0] = doc.form;
    q.startkey[1] = patient_id || serial_number;
    q.startkey[2] = clinic_id;

    q.endkey[0] = q.startkey[0];
    q.endkey[1] = q.startkey[1];
    q.endkey[2] = q.startkey[2];

    // filtering view by time is optional
    if (time_key && time_val) {
        q.startkey[3] = moment(date.getDate()).subtract(time_val, time_key).valueOf();
        q.endkey[3] = doc.reported_date;
    } else {
        q.endkey[3] = {};
    }

    db.medic.view('kujua-sentinel', view, q, function(err, data) {
        if (err) {
            return callback(err);
        } else if (options.filter) {
            return callback(null, _.filter(data.rows, options.filter));
        }
        callback(null, data.rows);
    });
};

var checkOHWDuplicates = function(options, callback) {
    var doc = options.doc,
        id_val = options.serial_number || options.patient_id;

    var msg = 'Duplicate record found; \'{{id_val}}\' was already reported';

    if (options.time_val && options.time_key) {
        msg += ' within ' + options.time_val + ' ' + options.time_key;
    }

    msg = template.render(msg, { id_val: id_val });

    getOHWMatchingRecords(options, function(err, data) {
        if (err) {
            callback(err);
        } else if (data && data.length <= 1) {
            callback();
        } else {
            addError(doc, {
                code: 'duplicate_record', message: msg
            });
            callback(msg);
        }
    });
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
        'kujua-sentinel', 
        'data_records_by_form_and_clinic', 
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
        var self = module.exports,
            due = options.due,
            message = options.message,
            phone = applyPhoneFilters(config, options.phone);

        doc.scheduled_tasks = doc.scheduled_tasks || [];
        if (due instanceof Date) {
            due = due.getTime();
        }
        options = _.omit(options, 'message', 'due', 'phone');

        if (message.length > 160) {
            message = message.substr(0, 160 - 3) + '...';
        }

        var task = {
            due: due,
            messages: [{
                to: phone,
                message: message
            }]
        };

        if (!self.isOutgoingAllowed(doc.from)) {
            setTaskState(task, 'denied');
        } else {
            setTaskState(task, 'scheduled');
        }

        _.extend(task, options);
        doc.scheduled_tasks.push(task);
    },
    obsoleteScheduledMessages: function(doc, type, reported_date, before) {
        var changed = false,
            group;

        if (!doc || !doc.scheduled_tasks || !reported_date || !type) {
            return false;
        }

        // setup window to look for tasks based on before value
        if (!before) {
             before = moment(reported_date)
                .add(config.get('ohw_obsolete_reminders_days') || 21, 'days')
                .valueOf();
        }

        // find group
        // scheduled_tasks should be sorted by due date
        var t = _.find(doc.scheduled_tasks, function(task) {
            return task &&
                   type === task.type &&
                   task.state === 'scheduled' &&
                   task.due >= reported_date &&
                   task.due <= before;
        });
        group = t && t.group;

        // clear tasks types that were due before reported date, or if
        // the same type and group.
        _.each(doc.scheduled_tasks, function(task) {
            if (task &&
                type === task.type &&
                (task.due <= reported_date || task.group === group)) {
                setTaskState(task, 'cleared');
                changed = true;
            }
        });

        return changed;

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
    getOHWRegistration: getOHWRegistration,
    getOHWMatchingRecords: getOHWMatchingRecords,
    checkOHWDuplicates: checkOHWDuplicates,
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

        db.medic.view('kujua-sentinel', 'registered_patients', {
            key: String(id),
            include_docs: true
        }, function(err, data) {
            if (err) {
                return callback(err);
            }
            var docs = _.filter(data.rows, function(row) {
                // optionally filter by form as well
                if (form) {
                    return row.doc.form === form;
                } else {
                    return true;
                }
            });
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
