/*
 * Utility functions for Medic Mobile
 */
var utils = require('kujua-utils'),
    logger = utils.logger,
    _ = require('underscore'),
    objectpath = require('views/lib/objectpath');

/*
 * @param {Object} data_record - typically a data record or portion (hash)
 * @param {String} key - key for field
 * @param {Object} def - form or field definition
 * @api private
*/
var prettyVal = function(data_record, key, def) {

    if (!data_record || _.isUndefined(key) || _.isUndefined(data_record[key])) {
        return;
    }

    var val = data_record[key];

    if (!def) {
        return val;
    }

    if (def.fields && def.fields[key]) {
        def = def.fields[key];
    }

    switch (def.type) {
        case 'boolean':
            return val === true ? 'True' : 'False';
        case 'date':
            return exports.info.formatDate(data_record[key]);
        case 'integer':
            // use list value for month
            if (def.validate && def.validate.is_numeric_month) {
                if (def.list) {
                    for (var i in def.list) {
                        var item = def.list[i];
                        if (item[0] === val) {
                            return exports.info.translate(item[1], locale);
                        }
                    }
                }
            }
        default:
            return val;
    }

};

function filterObject(obj) {
    // any arguments after the first are to be removed
    var keys = _.rest(arguments, 1);

    _.each(obj, function(key, val) {
        // also any key of the object that isn't _id or _key but otherwise starts with _ or $
        if (!_.contains(['_id', '_key'], key) && /^[_$]/.test(key)) {
            keys.push(key);
        }
    });

    return _.omit(obj, keys);
}

// reverse makeDataRecordReadable munge. ;\
exports.makeDataRecordOriginal = function(doc) {
    doc = filterObject(
        doc,
        'fields',
        'scheduled_tasks_by_group',
        'outgoing_messages',
        'outgoing_messages_recipients'
    );

    if (doc.tasks) {
        doc.tasks = _.map(doc.tasks, function(task) {
            return filterObject(task);
        });
    }

    return doc;
};

/*
 * With some forms like ORPT (patient registration), we add additional data to
 * it based on other form submissions.  Form data from other reports is used to
 * create these fields and it is useful to show these new fields in the data
 * records screen/render even though they are not defined in the form.
 *
 */
var includeNonFormFields = function(doc, form_keys, locale) {

    var fields = [
        'mother_outcome',
        'child_birth_outcome',
        'child_birth_weight',
        'child_birth_date',
        'expected_date',
        'birth_date',
        'patient_id'
    ];

    var dateFields = [
        'child_birth_date',
        'expected_date',
        'birth_date'
    ];

    _.each(fields, function(field) {
        var label = exports.info.translate(field, locale),
            value = doc[field];

        // Only include the property if we find it on the doc and not as a form
        // key since then it would be duplicated.
        if (!value || form_keys.indexOf(field) !== -1) {
            return;
        }

        if (_.contains(dateFields, field)) {
            value = exports.info.formatDate(value);
        }

        doc.fields.data.unshift({
            label: label,
            value: value,
            isArray: false,
            generated: true
        });

        doc.fields.headers.unshift({
            head: label
        });

    });
};

/*
 * Take data record document and return nice formated JSON object.
 *
 * NOTE: Any properties you add to the doc/record here need to be removed in
 * makeDataRecordOriginal.
 *
 */
exports.makeDataRecordReadable = function(doc, appinfo, language) {

    exports.info = appinfo || exports.info;

    var data_record = doc;
    var language = language || getLocale(doc);

    // adding a fields property for ease of rendering code
    if(data_record.form) {
        var keys = getFormKeys(exports.info.getForm(data_record.form));
        var labels = exports.getLabels(keys, data_record.form, language);
        data_record.fields = exports.fieldsToHtml(keys, labels, data_record);
        includeNonFormFields(data_record, keys, language);
    }

    if(data_record.scheduled_tasks) {
        data_record.scheduled_tasks_by_group = [];
        var groups = {};
        for (var i in data_record.scheduled_tasks) {
            var t = data_record.scheduled_tasks[i],
                copy = _.clone(t);

            // avoid crash if item is falsey
            if (!t) continue;

            if (t.due) {
                copy.due = t.due;
            }

            // timestamp is used for sorting in the frontend
            if (t.timestamp) {
                copy.timestamp = t.timestamp;
            } else if (t.due) {
                copy.timestamp = t.due;
            }

            // setup scheduled groups
            var group_name = t.type;
            if (t.group) {
                group_name += ":" + t.group;
            }

            if (!groups[group_name]) {
                groups[group_name] = {
                    group: group_name,
                    type: t.type,
                    number: t.group,
                    rows: []
                };
            }
            //
            // Warning: _idx is used on frontend during save.
            //
            copy._idx = i;
            groups[group_name].rows.push(copy);
        }
        for (var k in groups) {
            data_record.scheduled_tasks_by_group.push(groups[k]);
        }
    }

    /*
     * Prepare outgoing messages for render. Reduce messages to organize by
     * properties: sent_by, from, state and message.  This helps for easier
     * display especially in the case of bulk sms.
     *
     * messages = [
     *    {
     *       recipients: [
     *          {
     *              to: '+123',
     *              facility: <facility>,
     *              timestamp: <timestamp>,
     *              uuid: <uuid>,
     *          },
     *          ...
     *        ],
     *        sent_by: 'admin',
     *        from: '+998',
     *        state: 'sent',
     *        message: 'good morning'
     *    }
     *  ]
     */
    if (data_record.kujua_message) {
        var outgoing_messages = [],
            outgoing_messages_recipients = [],
            msgs = {};
        _.each(data_record.tasks, function(task) {
            _.each(task.messages, function(msg) {
                var recipient = {
                    to: msg.to,
                    facility: msg.facility,
                    timestamp: task.timestamp,
                    uuid: msg.uuid
                };
                var done = false;
                // append recipient to existing
                _.each(outgoing_messages, function(m) {
                    if (msg.message === m.message
                            && msg.sent_by === m.sent_by
                            && msg.from === m.from
                            && task.state === m.state) {
                        m.recipients.push(recipient);
                        outgoing_messages_recipients.push(recipient);
                        done = true;
                    }
                });
                // create new entry
                if (!done) {
                    outgoing_messages.push({
                        recipients: [recipient],
                        sent_by: msg.sent_by,
                        from: msg.from,
                        state: task.state,
                        message: msg.message
                    });
                    outgoing_messages_recipients.push(recipient);
                }
            });
        });
        data_record.outgoing_messages = outgoing_messages;
        data_record.outgoing_messages_recipients = outgoing_messages_recipients;
    }

    return data_record;
};

/*
 * @api private
 * */
exports.fieldsToHtml = function(keys, labels, data_record, def) {

    if (!def && data_record && data_record.form)
        def = exports.info.getForm(data_record.form);

    if (_.isString(def))
        def = exports.info.getForm(def);

    var fields = {
        headers: [],
        data: []
    };

    _.each(keys, function(key) {
        if(_.isArray(key)) {
            fields.headers.push({head: utils.titleize(key[0])});
            fields.data.push(_.extend(
                exports.fieldsToHtml(key[1], labels, data_record[key[0]], def),
                {isArray: true}
            ));
        } else {
            var label = labels.shift();
            fields.headers.push({head: exports.info.getMessage(label)});
            if (def && def[key]) {
                def = def[key];
            }
            fields.data.push({
                isArray: false,
                value: prettyVal(data_record, key, def),
                label: label
            });
        }
    });

    return fields;
};

/*
 * @api private
 * */
function translateKey(key, field, locale) {
    var label;

    if (field) {
        label = getLabel(field, locale);
    } else {
        label = exports.info.translate(key, locale);
    }
    // still haven't found a proper label; then titleize
    if (key === label) {
        return utils.titleize(key);
    } else {
        return label;
    }
}

/*
 * Fetch labels from translation strings or jsonform object, maintaining order
 * in the returned array.
 *
 * @param Array keys - keys we want to resolve labels for
 * @param String form - form code string
 * @param String locale - locale string, e.g. 'en', 'fr', 'en-gb'
 *
 * @return Array  - form field labels based on forms definition.
 *
 * @api private
 */
exports.getLabels = function(keys, form, locale) {

    var def = exports.info.getForm(form),
        fields = def && def.fields;

    return _.reduce(keys, function(memo, key) {
        var field = fields && fields[key],
            keys;

        if (_.isString(key)) {
            memo.push(translateKey(key, field, locale));
        } else if (_.isArray(key)) {
            keys = unrollKey(key);

            _.each(keys, function(key) {
                var field = fields && fields[key];

                memo.push(translateKey(key, field, locale));
            });
        }

        return memo;
    }, []);
};

// returns the deepest array from `key`
function unrollKey(array) {
    var target = [].concat(array),
        root = [];

    while (_.isArray(_.last(target))) {
        root.push(_.first(target));
        target = _.last(target);
    }

    return _.map(target, function(item) {
        return root.concat([item]).join('.');
    });
}

function getLabel(field, locale) {
    return exports.info.getMessage(field.labels && field.labels.short, locale);
}


function getLocale(record) {
    return record.locale || (record.sms_message && record.sms_message.locale) || 'en';
}

/*
 * Get an array of values from the doc by the keys from the given keys array.
 * Supports deep keys, like:
 *
 *  ['foo', 'bar', 'baz']
 *  ['foo', ['bar', ['baz']]]
 *  ['foo', ['bar', 'baz']]
 *
 * @param Object doc - data record document
 * @param Array keys - keys we want values for
 *
 * @return Array  - values from doc in the same order as keys, return null if
 * the key cannot be resolved.
 */
var getValues = exports.getValues = function(doc, keys) {
    var ret = [];
    if (!_.isObject(doc)) return ret;
    if (keys === undefined) return ret;
    if (!_.isArray(keys)) {
        var value = objectpath.get(doc, keys);
        if (typeof value === 'undefined') {
            ret.push(null);
        } else if (_.isObject(value) || _.isArray(value)) {
            ret.push(JSON.stringify(value));
        } else {
            ret.push(value);
        }
    }
    if (_.isArray(keys)) {
        for (var i in keys) {
            var key = keys[i];
            if (_.isArray(key)) {
                // key is array so we are look for object on doc matching first
                // array element and recurse.
                if (doc[key[0]] === null) {
                    ret = ret.concat([null]);
                    continue;
                } else if (typeof doc[key[0]] === 'object') {
                    // recurse using sub-object and array wrapped key to signify
                    // sub-object parsing.
                    ret = ret.concat(getValues(doc[key[0]], [key[1]]));
                } else if (doc[key[0]] !== undefined) {
                    // looks like array points to list of values
                    ret = ret.concat(getValues(doc, key));
                    //ret = doc[key[0]] ? ret.concat(doc[key[0]]) : ret.concat(null);
                } else {
                    // no sub-object or value match in sub object, continue.
                    ret = ret.concat([null]);
                    continue;
                }
            } else {
                // if not array assume normal scalar key and look for match
                // if key points to object
                ret = ret.concat(getValues(doc, key));
            }
        }
    }

    return ret;
};


/*
 * Get an array of keys from the form.  If dot notation is used it will be an
 * array of arrays.
 *
 * @param Object def - form definition
 *
 * @return Array  - form field keys based on forms definition
 */
var getFormKeys = exports.getFormKeys = function(def) {

    var keys = {};

    var getKeys = function(key, hash) {
        if(key.length > 1) {
            var tmp = key.shift();
            if(!hash[tmp]) {
                hash[tmp] = {};
            }
            getKeys(key, hash[tmp]);
        } else {
            hash[key[0]] = '';
        }
    };

    var hashToArray = function(hash) {
        var array = [];

        _.each(hash, function(value, key) {
            if(typeof value === "string") {
                array.push(key);
            } else {
                array.push([key, hashToArray(hash[key])]);
            }
        });

        return array;
    };

    if (def) {
        for (var k in def.fields) {
            getKeys(k.split('.'), keys);
        }
    }

    return hashToArray(keys);
};

/*
 * @param {Object} record - data record
 * @param {String|Object} error - error object or code matching key in messages
 *
 * @returns boolean
 */
exports.hasError = function(record, error) {
    if (!record || !error) return;

    if (_.isString(error)) {
        error = {
            code: error,
            message: ''
        };
    }

    var existing = _.findWhere(record.errors, {
        code: error.code
    });

    return !!existing;
};

/*
 * Append error to data record if it doesn't already exist. we don't need
 * redundant errors. Error objects should always have a code and message
 * attributes.
 *
 * @param {Object} record - data record
 * @param {String|Object} error - error object or code matching key in messages
 *
 * @returns undefined
 */
exports.addError = function(record, error) {
    if (!record || !error) return;

    if (_.isString(error)) {
        error = {
            code: error,
            message: ''
        }
    }

    if (exports.hasError(record, error)) {
        return;
    }

    var form = record.form && record.sms_message && record.sms_message.form;

    if (!error.message)
        error.message = exports.info.translate(error.code, getLocale(record));

    // replace placeholder strings
    error.message = error.message
        .replace('{{fields}}', error.fields && error.fields.join(', '))
        .replace('{{form}}', form);

    record.errors ? record.errors.push(error) : record.errors = [error];

    logger.warn(JSON.stringify(error));
};

exports.capitalize = function(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// placeholder function that will be replaced with appInfo from the calling
// update/show/list function
exports.info = {
    getForm: function() {},
    getMessage: function(value, locale) {
        locale = locale || 'en';

        if (!value || _.isString(value)) {
            return value;
        } else if (value[locale]) {
            return value[locale];
        } else {
            // if desired locale not present return first string
            return value[_.first(_.keys(value))];
        }
    },
    translate: function(key) {
        return key;
    }
};
