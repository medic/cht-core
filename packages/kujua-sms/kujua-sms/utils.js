/**
 * Utility functions for Kujua
 */

var utils = require('kujua-utils'),
    settings = require('settings/root'),
    jsonforms = require('views/lib/jsonforms'),
    logger = require('kujua-utils').logger,
    _ = require('underscore'),
    moment = require('moment');

/*
 * @param {Object} data_record - typically a data record or portion (hash)
 * @param {String} key - key for field
 * @param {Object} def - form or field definition
 * @api private
*/
var prettyVal = function(data_record, key, def) {

    if (!data_record || _.isUndefined(key) || _.isUndefined(data_record[key]))
        return;

    var val  = data_record[key];

    if (!def)
        return val;

    if (def.fields && def.fields[key]) {
        def = def.fields[key];
    }

    switch (def.type) {
        case 'boolean':
            if (val === true)
                return 'True';
            if (val === false)
                return 'False';
        case 'date':
            if (val) {
                var m = moment(data_record[key]);
                return m.format('DD, MMM YYYY');
            }
            return;
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

function formatDate(timestamp, format) {
    format = format || 'ddd DD, MMM YYYY, HH:mm:ss ZZ';
    return moment(timestamp).format(format);
};

/*
 * With some forms like ORPT (patient registration), we add additional data to
 * it based on other form submissions.  Form data from other reports is used to
 * create these fields and it is useful to show these new fields in the data
 * records screen/render even though they are not defined in the form.
 *
 */
var includeNonFormFields = function(doc, form_keys) {

    var fields = [
        { key:'mother_outcome', label: 'Mother Outcome'},
        { key:'child_birth_outcome', label: 'Child Birth Outcome'},
        { key:'child_birth_weight', label: 'Child Birth Weight'},
        { key:'child_birth_date', label: 'Child Birth Date', format: formatDate},
        { key:'expected_date', label: 'Expected Date', format: formatDate},
        { key:'birth_date', label: 'Birth Date', format: formatDate},
        { key:'patient_id', label:'Patient ID'}
    ];

    _.each(fields, function(obj) {
        var key = obj.key,
            label = obj.label,
            format = obj.format;

        // Only include the property if we find it on the doc and not as a form
        // key since then it would be duplicated.
        if (!doc[key] || form_keys.indexOf(key) !== -1) return;

        doc.fields.data.unshift({
            isArray: false,
            label: label,
            value: format ? format(doc[key]) : doc[key]
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
exports.makeDataRecordReadable = function(doc) {
    var data_record = doc;

    // adding a fields property for ease of rendering code
    if(data_record.form) {
        var keys = getFormKeys(data_record.form);
        var labels = exports.getLabels(keys, data_record.form, getLocale(doc));
        data_record.fields = exports.fieldsToHtml(keys, labels, data_record);
        includeNonFormFields(data_record, keys);
    }

    if(data_record.scheduled_tasks) {
        data_record.scheduled_tasks_by_group = [];
        var groups = {};
        for (var i in data_record.scheduled_tasks) {
            var t = data_record.scheduled_tasks[i],
                copy = _.clone(t);

            // avoid crash if item is falsey
            if (!t) continue;

            // format timestamp
            if (t.due) {
                copy._due_ts = t.due;
                copy.due = formatDate(t.due);
            }

            if (t.timestamp) {
                copy.timestamp = formatDate(t.timestamp);
            }

            // setup scheduled groups
            var group_name = t.type;
            if (t.group)
                group_name += ":"+t.group;
            if (!groups[group_name]) {
                groups[group_name] = {
                    group: group_name,
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
            // sort by due date ascending
            groups[k].rows.sort(function(l,r) {
                if (l._due_ts && r._due_ts) return l._due_ts > r._due_ts;
            });
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
        if (window) {
            console.log('outgoing_messages', outgoing_messages);
        }
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
        def = jsonforms.getForm(data_record.form);

    if (_.isString(def))
        def = jsonforms.getForm(def);

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
            if (def && def[key])
                def = def[key]
            var v = prettyVal(data_record, key, def);
            fields.data.push({
                isArray: false,
                value: prettyVal(data_record, key, def),
                label: label
            });
        }
    });

    return fields;
};

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
 * @return Array  - form field labels based on jsonforms definition.
 *
 * @api private
 */
exports.getLabels = function(keys, form, locale) {
    var def = jsonforms.getForm(form),
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
    return (record.sms_message && record.sms_message.locale) || 'en';
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
        if (typeof doc[keys] === 'undefined') {
            ret.push(null);
        } else if (_.isObject(doc[keys]) || _.isArray(doc[keys])) {
            ret.push(JSON.stringify(doc[keys]));
        } else {
            ret.push(doc[keys]);
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
 * Get an array of keys from the form.
 * If dot notation is used it will be an array
 * of arrays.
 *
 * @param String form - jsonforms key
 *
 * @return Array  - form field keys based on jsonforms definition
 */
var getFormKeys = exports.getFormKeys = function(form) {
    var keys = {},
        def = jsonforms.getForm(form);

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

var entityTable = {
//  34: "&quot;",       // Quotation mark. Not required
    38: "&amp;",        // Ampersand. Applied before everything else in the application
    60: "&lt;",     // Less-than sign
    62: "&gt;",     // Greater-than sign
//  63: "&#63;",        // Question mark
//  111: "&#111;",      // Latin small letter o
    160: "&nbsp;",      // Non-breaking space
    161: "&iexcl;",     // Inverted exclamation mark
    162: "&cent;",      // Cent sign
    163: "&pound;",     // Pound sign
    164: "&curren;",    // Currency sign
    165: "&yen;",       // Yen sign
    166: "&brvbar;",    // Broken vertical bar
    167: "&sect;",      // Section sign
    168: "&uml;",       // Diaeresis
    169: "&copy;",      // Copyright sign
    170: "&ordf;",      // Feminine ordinal indicator
    171: "&laquo;",     // Left-pointing double angle quotation mark
    172: "&not;",       // Not sign
    173: "&shy;",       // Soft hyphen
    174: "&reg;",       // Registered sign
    175: "&macr;",      // Macron
    176: "&deg;",       // Degree sign
    177: "&plusmn;",    // Plus-minus sign
    178: "&sup2;",      // Superscript two
    179: "&sup3;",      // Superscript three
    180: "&acute;",     // Acute accent
    181: "&micro;",     // Micro sign
    182: "&para;",      // Pilcrow sign
    183: "&middot;",    // Middle dot
    184: "&cedil;",     // Cedilla
    185: "&sup1;",      // Superscript one
    186: "&ordm;",      // Masculine ordinal indicator
    187: "&raquo;",     // Right-pointing double angle quotation mark
    188: "&frac14;",    // Vulgar fraction one-quarter
    189: "&frac12;",    // Vulgar fraction one-half
    190: "&frac34;",    // Vulgar fraction three-quarters
    191: "&iquest;",    // Inverted question mark
    192: "&Agrave;",    // A with grave
    193: "&Aacute;",    // A with acute
    194: "&Acirc;",     // A with circumflex
    195: "&Atilde;",    // A with tilde
    196: "&Auml;",      // A with diaeresis
    197: "&Aring;",     // A with ring above
    198: "&AElig;",     // AE
    199: "&Ccedil;",    // C with cedilla
    200: "&Egrave;",    // E with grave
    201: "&Eacute;",    // E with acute
    202: "&Ecirc;",     // E with circumflex
    203: "&Euml;",      // E with diaeresis
    204: "&Igrave;",    // I with grave
    205: "&Iacute;",    // I with acute
    206: "&Icirc;",     // I with circumflex
    207: "&Iuml;",      // I with diaeresis
    208: "&ETH;",       // Eth
    209: "&Ntilde;",    // N with tilde
    210: "&Ograve;",    // O with grave
    211: "&Oacute;",    // O with acute
    212: "&Ocirc;",     // O with circumflex
    213: "&Otilde;",    // O with tilde
    214: "&Ouml;",      // O with diaeresis
    215: "&times;",     // Multiplication sign
    216: "&Oslash;",    // O with stroke
    217: "&Ugrave;",    // U with grave
    218: "&Uacute;",    // U with acute
    219: "&Ucirc;",     // U with circumflex
    220: "&Uuml;",      // U with diaeresis
    221: "&Yacute;",    // Y with acute
    222: "&THORN;",     // Thorn
    223: "&szlig;",     // Sharp s. Also known as ess-zed
    224: "&agrave;",    // a with grave
    225: "&aacute;",    // a with acute
    226: "&acirc;",     // a with circumflex
    227: "&atilde;",    // a with tilde
    228: "&auml;",      // a with diaeresis
    229: "&aring;",     // a with ring above
    230: "&aelig;",     // ae. Also known as ligature ae
    231: "&ccedil;",    // c with cedilla
    232: "&egrave;",    // e with grave
    233: "&eacute;",    // e with acute
    234: "&ecirc;",     // e with circumflex
    235: "&euml;",      // e with diaeresis
    236: "&igrave;",    // i with grave
    237: "&iacute;",    // i with acute
    238: "&icirc;",     // i with circumflex
    239: "&iuml;",      // i with diaeresis
    240: "&eth;",       // eth
    241: "&ntilde;",    // n with tilde
    242: "&ograve;",    // o with grave
    243: "&oacute;",    // o with acute
    244: "&ocirc;",     // o with circumflex
    245: "&otilde;",    // o with tilde
    246: "&ouml;",      // o with diaeresis
    247: "&divide;",    // Division sign
    248: "&oslash;",    // o with stroke. Also known as o with slash
    249: "&ugrave;",    // u with grave
    250: "&uacute;",    // u with acute
    251: "&ucirc;",     // u with circumflex
    252: "&uuml;",      // u with diaeresis
    253: "&yacute;",    // y with acute
    254: "&thorn;",     // thorn
    255: "&yuml;",      // y with diaeresis
    264: "&#264;",      // Latin capital letter C with circumflex
    265: "&#265;",      // Latin small letter c with circumflex
    338: "&OElig;",     // Latin capital ligature OE
    339: "&oelig;",     // Latin small ligature oe
    352: "&Scaron;",    // Latin capital letter S with caron
    353: "&scaron;",    // Latin small letter s with caron
    372: "&#372;",      // Latin capital letter W with circumflex
    373: "&#373;",      // Latin small letter w with circumflex
    374: "&#374;",      // Latin capital letter Y with circumflex
    375: "&#375;",      // Latin small letter y with circumflex
    376: "&Yuml;",      // Latin capital letter Y with diaeresis
    402: "&fnof;",      // Latin small f with hook, function, florin
    710: "&circ;",      // Modifier letter circumflex accent
    732: "&tilde;",     // Small tilde
    913: "&Alpha;",     // Alpha
    914: "&Beta;",      // Beta
    915: "&Gamma;",     // Gamma
    916: "&Delta;",     // Delta
    917: "&Epsilon;",   // Epsilon
    918: "&Zeta;",      // Zeta
    919: "&Eta;",       // Eta
    920: "&Theta;",     // Theta
    921: "&Iota;",      // Iota
    922: "&Kappa;",     // Kappa
    923: "&Lambda;",    // Lambda
    924: "&Mu;",        // Mu
    925: "&Nu;",        // Nu
    926: "&Xi;",        // Xi
    927: "&Omicron;",   // Omicron
    928: "&Pi;",        // Pi
    929: "&Rho;",       // Rho
    931: "&Sigma;",     // Sigma
    932: "&Tau;",       // Tau
    933: "&Upsilon;",   // Upsilon
    934: "&Phi;",       // Phi
    935: "&Chi;",       // Chi
    936: "&Psi;",       // Psi
    937: "&Omega;",     // Omega
    945: "&alpha;",     // alpha
    946: "&beta;",      // beta
    947: "&gamma;",     // gamma
    948: "&delta;",     // delta
    949: "&epsilon;",   // epsilon
    950: "&zeta;",      // zeta
    951: "&eta;",       // eta
    952: "&theta;",     // theta
    953: "&iota;",      // iota
    954: "&kappa;",     // kappa
    955: "&lambda;",    // lambda
    956: "&mu;",        // mu
    957: "&nu;",        // nu
    958: "&xi;",        // xi
    959: "&omicron;",   // omicron
    960: "&pi;",        // pi
    961: "&rho;",       // rho
    962: "&sigmaf;",    // sigmaf
    963: "&sigma;",     // sigma
    964: "&tau;",       // tau
    965: "&upsilon;",   // upsilon
    966: "&phi;",       // phi
    967: "&chi;",       // chi
    968: "&psi;",       // psi
    969: "&omega;",     // omega
    977: "&thetasym;",  // Theta symbol
    978: "&upsih;",     // Greek upsilon with hook symbol
    982: "&piv;",       // Pi symbol
    8194: "&ensp;",     // En space
    8195: "&emsp;",     // Em space
    8201: "&thinsp;",   // Thin space
    8204: "&zwnj;",     // Zero width non-joiner
    8205: "&zwj;",      // Zero width joiner
    8206: "&lrm;",      // Left-to-right mark
    8207: "&rlm;",      // Right-to-left mark
    8211: "&ndash;",    // En dash
    8212: "&mdash;",    // Em dash
    8216: "&lsquo;",    // Left single quotation mark
    8217: "&rsquo;",    // Right single quotation mark
    8218: "&sbquo;",    // Single low-9 quotation mark
    8220: "&ldquo;",    // Left double quotation mark
    8221: "&rdquo;",    // Right double quotation mark
    8222: "&bdquo;",    // Double low-9 quotation mark
    8224: "&dagger;",   // Dagger
    8225: "&Dagger;",   // Double dagger
    8226: "&bull;",     // Bullet
    8230: "&hellip;",   // Horizontal ellipsis
    8240: "&permil;",   // Per mille sign
    8242: "&prime;",    // Prime
    8243: "&Prime;",    // Double Prime
    8249: "&lsaquo;",   // Single left-pointing angle quotation
    8250: "&rsaquo;",   // Single right-pointing angle quotation
    8254: "&oline;",    // Overline
    8260: "&frasl;",    // Fraction Slash
    8364: "&euro;",     // Euro sign
    8472: "&weierp;",   // Script capital
    8465: "&image;",    // Blackletter capital I
    8476: "&real;",     // Blackletter capital R
    8482: "&trade;",    // Trade mark sign
    8501: "&alefsym;",  // Alef symbol
    8592: "&larr;",     // Leftward arrow
    8593: "&uarr;",     // Upward arrow
    8594: "&rarr;",     // Rightward arrow
    8595: "&darr;",     // Downward arrow
    8596: "&harr;",     // Left right arrow
    8629: "&crarr;",    // Downward arrow with corner leftward. Also known as carriage return
    8656: "&lArr;",     // Leftward double arrow. ISO 10646 does not say that lArr is the same as the 'is implied by' arrow but also does not have any other character for that function. So ? lArr can be used for 'is implied by' as ISOtech suggests
    8657: "&uArr;",     // Upward double arrow
    8658: "&rArr;",     // Rightward double arrow. ISO 10646 does not say this is the 'implies' character but does not have another character with this function so ? rArr can be used for 'implies' as ISOtech suggests
    8659: "&dArr;",     // Downward double arrow
    8660: "&hArr;",     // Left-right double arrow
    // Mathematical Operators
    8704: "&forall;",   // For all
    8706: "&part;",     // Partial differential
    8707: "&exist;",    // There exists
    8709: "&empty;",    // Empty set. Also known as null set and diameter
    8711: "&nabla;",    // Nabla. Also known as backward difference
    8712: "&isin;",     // Element of
    8713: "&notin;",    // Not an element of
    8715: "&ni;",       // Contains as member
    8719: "&prod;",     // N-ary product. Also known as product sign. Prod is not the same character as U+03A0 'greek capital letter pi' though the same glyph might be used for both
    8721: "&sum;",      // N-ary summation. Sum is not the same character as U+03A3 'greek capital letter sigma' though the same glyph might be used for both
    8722: "&minus;",    // Minus sign
    8727: "&lowast;",   // Asterisk operator
    8729: "&#8729;",    // Bullet operator
    8730: "&radic;",    // Square root. Also known as radical sign
    8733: "&prop;",     // Proportional to
    8734: "&infin;",    // Infinity
    8736: "&ang;",      // Angle
    8743: "&and;",      // Logical and. Also known as wedge
    8744: "&or;",       // Logical or. Also known as vee
    8745: "&cap;",      // Intersection. Also known as cap
    8746: "&cup;",      // Union. Also known as cup
    8747: "&int;",      // Integral
    8756: "&there4;",   // Therefore
    8764: "&sim;",      // tilde operator. Also known as varies with and similar to. The tilde operator is not the same character as the tilde, U+007E, although the same glyph might be used to represent both
    8773: "&cong;",     // Approximately equal to
    8776: "&asymp;",    // Almost equal to. Also known as asymptotic to
    8800: "&ne;",       // Not equal to
    8801: "&equiv;",    // Identical to
    8804: "&le;",       // Less-than or equal to
    8805: "&ge;",       // Greater-than or equal to
    8834: "&sub;",      // Subset of
    8835: "&sup;",      // Superset of. Note that nsup, 'not a superset of, U+2283' is not covered by the Symbol font encoding and is not included.
    8836: "&nsub;",     // Not a subset of
    8838: "&sube;",     // Subset of or equal to
    8839: "&supe;",     // Superset of or equal to
    8853: "&oplus;",    // Circled plus. Also known as direct sum
    8855: "&otimes;",   // Circled times. Also known as vector product
    8869: "&perp;",     // Up tack. Also known as orthogonal to and perpendicular
    8901: "&sdot;",     // Dot operator. The dot operator is not the same character as U+00B7 middle dot
    // Miscellaneous Technical
    8968: "&lceil;",    // Left ceiling. Also known as an APL upstile
    8969: "&rceil;",    // Right ceiling
    8970: "&lfloor;",   // left floor. Also known as APL downstile
    8971: "&rfloor;",   // Right floor
    9001: "&lang;",     // Left-pointing angle bracket. Also known as bra. Lang is not the same character as U+003C 'less than'or U+2039 'single left-pointing angle quotation mark'
    9002: "&rang;",     // Right-pointing angle bracket. Also known as ket. Rang is not the same character as U+003E 'greater than' or U+203A 'single right-pointing angle quotation mark'
    // Geometric Shapes
    9642: "&#9642;",    // Black small square
    9643: "&#9643;",    // White small square
    9674: "&loz;",      // Lozenge
    // Miscellaneous Symbols
    9702: "&#9702;",    // White bullet
    9824: "&spades;",   // Black (filled) spade suit
    9827: "&clubs;",    // Black (filled) club suit. Also known as shamrock
    9829: "&hearts;",   // Black (filled) heart suit. Also known as shamrock
    9830: "&diams;"     // Black (filled) diamond suit
}

// return string with encoded htmlEntities
var htmlEntities = function(s) {
    if (typeof s !== 'string') {return s;}
    var ret = [];
    for (var i=0; i<s.length; i++) {
        var ord = s.charCodeAt(i);
        if (!(ord in entityTable)) {
            ret.push(s[i]);
        } else {
            ret.push(entityTable[ord]);
        }
    }
    return ret.join('');
}

 //utf8 to 1251 converter (1 byte format, RU/EN support only + any other symbols) by drgluck

function utf8_decode (aa) {
    var bb = '', c = 0;
    for (var i = 0; i < aa.length; i++) {
        c = aa.charCodeAt(i);
        if (c > 127) {
            if (c > 1024) {
                if (c == 1025) {
                    c = 1016;
                } else if (c == 1105) {
                    c = 1032;
                }
                bb += String.fromCharCode(c - 848);
            }
        } else {
            bb += aa.charAt(i);
        }
    }
    return bb;
}

function unicodeToWin1251(s) {
    var codepointMap = {0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 11, 12: 12, 13: 13, 14: 14, 15: 15, 16: 16, 17: 17, 18: 18, 19: 19, 20: 20, 21: 21, 22: 22, 23: 23, 24: 24, 25: 25, 26: 26, 27: 27, 28: 28, 29: 29, 30: 30, 31: 31, 32: 32, 33: 33, 34: 34, 35: 35, 36: 36, 37: 37, 38: 38, 39: 39, 40: 40, 41: 41, 42: 42, 43: 43, 44: 44, 45: 45, 46: 46, 47: 47, 48: 48, 49: 49, 50: 50, 51: 51, 52: 52, 53: 53, 54: 54, 55: 55, 56: 56, 57: 57, 58: 58, 59: 59, 60: 60, 61: 61, 62: 62, 63: 63, 64: 64, 65: 65, 66: 66, 67: 67, 68: 68, 69: 69, 70: 70, 71: 71, 72: 72, 73: 73, 74: 74, 75: 75, 76: 76, 77: 77, 78: 78, 79: 79, 80: 80, 81: 81, 82: 82, 83: 83, 84: 84, 85: 85, 86: 86, 87: 87, 88: 88, 89: 89, 90: 90, 91: 91, 92: 92, 93: 93, 94: 94, 95: 95, 96: 96, 97: 97, 98: 98, 99: 99, 100: 100, 101: 101, 102: 102, 103: 103, 104: 104, 105: 105, 106: 106, 107: 107, 108: 108, 109: 109, 110: 110, 111: 111, 112: 112, 113: 113, 114: 114, 115: 115, 116: 116, 117: 117, 118: 118, 119: 119, 120: 120, 121: 121, 122: 122, 123: 123, 124: 124, 125: 125, 126: 126, 127: 127, 1027: 129, 8225: 135, 1046: 198, 8222: 132, 1047: 199, 1168: 165, 1048: 200, 1113: 154, 1049: 201, 1045: 197, 1050: 202, 1028: 170, 160: 160, 1040: 192, 1051: 203, 164: 164, 166: 166, 167: 167, 169: 169, 171: 171, 172: 172, 173: 173, 174: 174, 1053: 205, 176: 176, 177: 177, 1114: 156, 181: 181, 182: 182, 183: 183, 8221: 148, 187: 187, 1029: 189, 1056: 208, 1057: 209, 1058: 210, 8364: 136, 1112: 188, 1115: 158, 1059: 211, 1060: 212, 1030: 178, 1061: 213, 1062: 214, 1063: 215, 1116: 157, 1064: 216, 1065: 217, 1031: 175, 1066: 218, 1067: 219, 1068: 220, 1069: 221, 1070: 222, 1032: 163, 8226: 149, 1071: 223, 1072: 224, 8482: 153, 1073: 225, 8240: 137, 1118: 162, 1074: 226, 1110: 179, 8230: 133, 1075: 227, 1033: 138, 1076: 228, 1077: 229, 8211: 150, 1078: 230, 1119: 159, 1079: 231, 1042: 194, 1080: 232, 1034: 140, 1025: 168, 1081: 233, 1082: 234, 8212: 151, 1083: 235, 1169: 180, 1084: 236, 1052: 204, 1085: 237, 1035: 142, 1086: 238, 1087: 239, 1088: 240, 1089: 241, 1090: 242, 1036: 141, 1041: 193, 1091: 243, 1092: 244, 8224: 134, 1093: 245, 8470: 185, 1094: 246, 1054: 206, 1095: 247, 1096: 248, 8249: 139, 1097: 249, 1098: 250, 1044: 196, 1099: 251, 1111: 191, 1055: 207, 1100: 252, 1038: 161, 8220: 147, 1101: 253, 8250: 155, 1102: 254, 8216: 145, 1103: 255, 1043: 195, 1105: 184, 1039: 143, 1026: 128, 1106: 144, 8218: 130, 1107: 131, 8217: 146, 1108: 186, 1109: 190};
    var ret = [];
    for (var i=0; i<s.length; i++) {
        var ord = s.charCodeAt(i);
        if (!(ord in codepointMap)) {
            log("Character "+s.charAt(i)+" isn't supported by win1251!");
            ret.push(s[i]);
        } else {
            ret.push(String.fromCharCode(codepointMap[ord]));
        }
    }
    return ret.join('');
}

function toUnicode(theString) {
    var unicodeString = '';
    for (var i=0; i < theString.length; i++) {
        var theUnicode = theString.charCodeAt(i).toString(16).toUpperCase();
        while (theUnicode.length < 4) {
            theUnicode = '0' + theUnicode;
        }
        theUnicode = '%u' + theUnicode;
        unicodeString += theUnicode;
    }
    return unicodeString;
}

var capitalize = exports.capitalize = function(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/*
 * param Array arr  - array of headings and data arrays/rows
 * return String - string for rows with appropriate csv conventions.
 */
var arrayToCSV = exports.arrayToCSV = function(arr, delimiter) {
    var rows = [],
        delimiter = delimiter || '","';

    for (var r = 0; r < arr.length; r++) {
        var row = arr[r];
        var vals = [];
        for (var v = 0; v < row.length; v++) {
            var val = row[v];
            if (typeof val === 'string') {
                vals.push(val.replace(/"/g, '""'));
            }
            else {
                vals.push(val);
            }
        }
        rows.push('"' + vals.join(delimiter) + '"');
    }
    return rows.join('\n');
};

var getTypeForXML = function(val) {
    return 'String';
    //return val ? capitalize(typeof val) : 'String';
};

// SpreadsheetML by default, extend as needed.
// Based on http://code.google.com/p/php-excel/
var arrayToXML = exports.arrayToXML = function(arr, format) {
    var rows = [],
        format = format;


    for (var r = 0; r < arr.length; r++) {
        var row = arr[r],
            vals = [],
            val = null;

        for (var v = 0; v < row.length; v++) {
            val = row[v];
            vals.push(
                '<Cell><Data ss:Type="%s">'.replace('%s', getTypeForXML(val))
                + htmlEntities(val)
                + '</Data></Cell>'
            );
        }
        rows.push(vals.join(''));
    }
    return '<Row>' + rows.join('</Row>\n<Row>') + '</Row>';
};

// placeholder function that will be replaced with appInfo from the calling
// update/show/list function
exports.info = {
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

exports.getFormTitle = function(form) {
    var def = jsonforms.getForm(form),
        label = def && def.meta && def.meta.label,
        key,
        title;

    if (_.isString(label)) {
        title = exports.info.translate(label);
    } else if (_.isObject(label)) {
        key = _.first(_.keys(label));
        if (key && label[key]) {
            title = exports.info.translate(label[key]);
        }
    }

    if (title) {
        return title;
    } else {
        return form;
    }
}
