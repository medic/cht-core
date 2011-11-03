/**
 * The building blocks of Types and Forms, Fields help to validate and authorize
 * changes to docuemnt values.
 *
 * @module
 */


/**
 * Module dependencies
 */

var permissions = require('couchtypes/permissions'),
    validators = require('couchtypes/validators'),
    widgets = require('couchtypes/widgets'),
    utils = require('couchtypes/utils'),
    _ = require('underscore')._;


/**
 * Field objects are used when constructing content types and forms.
 *
 * #### Options ####
 *
 * * **omit_empty**  *Boolean* - whether to omit the field from a document when
 *                               the field is empty
 * * **permissions** *Object*  - a permissions check function or an object
 *                               containing separate functions to run on create,
 *                               edit and update operations.
 * * **validators**  *Array*   - an array of validation functions (default: [])
 * * **required**    *Boolean* - whether the field is required (default: true)
 *
 * @constructor
 * @name Field
 * @param {Object} options
 * @api public
 */

var Field = exports.Field = function Field(options) {
    _.extend(this, _.defaults(options || {}, {
        widget: widgets.text(),
        omit_empty: false,
        permissions: {},
        validators: [],
        required: true
    }));
    return this;
};


/**
 * Parses a raw value returning the correct JavaScript type for this field.
 * This will usually be overridden by other field types.
 *
 * @name Field.parse(raw)
 * @param raw
 * @api public
 */

Field.prototype.parse = function (raw) {
    return raw;
};


/**
 * Test values to see if field is considered empty.
 *
 * This function accepts the raw value even though by default it only
 * checks the parsed value, so that other field types overridding this method
 * have the raw data available.
 *
 * @name Field.isEmpty(value, raw)
 * @param value - the parsed value for the field
 * @param raw - the raw value for this field
 * @returns {Boolean}
 * @api public
 */

Field.prototype.isEmpty = function (value, raw) {
    if (raw === undefined) {
        if (typeof value === 'number' && isNaN(value)) {
            return true;
        }
        raw = value;
    }
    return (raw === '' || raw === null || raw === undefined);
};

/**
 * Run the field's validation functions against a value. Returns an
 * array of validation errors, or an empty array if valid.
 *
 * @name Field.validate(doc, value, raw)
 * @param {Object} doc
 * @param value
 * @param raw
 * @returns {Array}
 * @api public
 */

Field.prototype.validate = function (doc, value, raw) {
    // don't validate empty fields, but check if required
    if (this.isEmpty(value, raw)) {
        if (this.required) {
            if(_.isFunction(this.required)) {
                if(this.required(doc, value, raw)) {
                    return [ new Error('Required field') ];
                }
            } else {
                return [ new Error('Required field') ];
            }
        }
        return [];
    }
    return _.reduce(this.validators, function (errs, v) {
        try {
            // check that v is actually a function, since IE likes to
            // insert nulls here for some reason
            if (v) {
                errs = errs.concat(v(doc, value, raw) || []);
            }
        }
        catch (e) {
            errs.push(e);
        }
        return errs;
    }, []);
};

/**
 * Check relevant field permissions to see if user is authorised to make
 * changes. Returns an array of permissions errors, or an empty array if the
 * changes are permissible.
 *
 * @name Field.authorize(newDoc, oldDoc, newVal, oldVal, userCtx)
 * @param {Object} newDoc
 * @param {Object} oldDoc
 * @param newVal
 * @param oldVal
 * @param {Object} userCtx
 * @returns {Array}
 * @api public
 */

Field.prototype.authorize = function (newDoc, oldDoc, newVal, oldVal, userCtx) {
    var perms = this.permissions;
    var errors = [];
    if (_.isFunction(perms)) {
        errors = errors.concat(
            utils.getErrors(perms, arguments)
        );
    }
    // on update
    var fn;
    // on add
    if (newDoc && !oldDoc) {
        fn = perms.add;
    }
    // on remove
    else if (!newDoc || newDoc._deleted) {
        fn = perms.remove;
    }
    // on update
    else if (newVal !== oldVal) {
        fn = perms.update;
    }
    if (fn) {
        errors = errors.concat(
            utils.getErrors(fn, arguments)
        );
    }
    return errors;
};


/**
 * Embedded objects represent a Type embedded within another Type or set of
 * Fields. Its not a true field, but like the Field constructor it acts as a
 * marker when walking through the sub-objects that make up a schema.
 *
 * Exposes the same methods as Field objects.
 *
 * #### Options ####
 *
 * * **type**        *Type Object*  - Required, the Type definition to embed
 * * **omit_empty**  *Boolean* - whether to omit the field from a document when
 *                               the field is empty
 * * **permissions** *Object*  - a permissions check function or an object
 *                               containing separate functions to run on create,
 *                               edit and update operations.
 * * **validators**  *Array*   - an array of validation functions (default: [])
 * * **required**    *Boolean* - whether the field is required (default: true)
 *
 * @name Embedded
 * @param {Object} options
 * @constructor
 * @api public
 */

var Embedded = exports.Embedded = function Embedded(options) {
    options = options || {};
    var type = options.type;
    if (!type) {
        throw new Error('No type specified');
    }
    if(options.permissions) {
        type.permissions = options.permissions;
    }
    _.extend(this, _.defaults(options, {
        required: true
    }));
    this.type = type;
};

/**
 * Test values to see if field is considered empty.
 *
 * This function accepts the raw value even though by default it only
 * checks the parsed value, so that other field types overridding this method
 * have the raw data available.
 *
 * @name Embedded.isEmpty(value, raw)
 * @param value - the parsed value for the field
 * @param raw - the raw value for this field
 * @api public
 */

Embedded.prototype.isEmpty = function (value, raw) {
    return (value === '' || value === null || value === undefined);
};

/**
 * Run the type's validate function against a value. Returns an
 * array of validation errors, or an empty array if valid.
 *
 * @name Embedded.validate(doc, value, raw)
 * @param {Object} doc
 * @param value
 * @param raw
 * @returns {Array}
 * @api public
 */

Embedded.prototype.validate = function (doc, value, raw) {
    // don't validate empty fields, but check if required
    if (this.isEmpty(value, raw)) {
        if (this.required) {
            return [ new Error('Required field') ];
        }
        return [];
    }
    if (!value._id) {
        return [new Error('Embedded document missing _id')];
    }
    return this.type.validate(value, raw);
};

/**
 * Check relevant type permissions to see if user is authorised to make
 * changes. Returns an array of permissions errors, or an empty array if the
 * changes are permissible.
 *
 * @name Embedded.authorize(newDoc, oldDoc, newVal, oldVal, user)
 * @param {Object} newDoc
 * @param {Object} oldDoc
 * @param newVal
 * @param oldVal
 * @param {Object} user
 * @returns {Array}
 * @api public
 */

Embedded.prototype.authorize = function (newDoc, oldDoc, newVal, oldVal, user) {
    if (newVal && oldVal && newVal._id !== oldVal._id) {
        oldVal = undefined;
    }
    return this.type.authorize(newVal || {_deleted: true}, oldVal, user);
};

/**
 * EmbeddedList objects represent multiple instances of a Type embedded within
 * another Type or set of Fields. Its not a true field, but like the Field
 * constructor it acts as a marker when walking through the sub-objects that
 * make up a schema.
 *
 * Exposes the same methods as Field objects.
 *
 * #### Options ####
 *
 * * **type**        *Type Object*  - Required, the Type definition to embed
 * * **omit_empty**  *Boolean* - whether to omit the field from a document when
 *                               the field is empty
 * * **permissions** *Object*  - a permissions check function or an object
 *                               containing separate functions to run on create,
 *                               edit and update operations.
 * * **validators**  *Array*   - an array of validation functions (default: [])
 * * **required**    *Boolean* - whether the field is required (default: true)
 *
 * @name EmbeddedList
 * @param {Object} options
 * @constructor
 * @api public
 */

var EmbeddedList = exports.EmbeddedList = function EmbeddedList(options) {
    options = options || {};
    var type = options.type;
    if (!type) {
        throw new Error('No type specified');
    }
    options.permissions = _.defaults((options.permissions || {}), {
        add: permissions.inherit(type),
        remove: permissions.inherit(type),
        update: permissions.inherit(type)
    });
    _.extend(this, _.defaults(options, {
        required: true
    }));
    this.type = type;
};

/**
 * Test values to see if field is considered empty.
 *
 * This function accepts the raw value even though by default it only
 * checks the parsed value, so that other field types overridding this method
 * have the raw data available.
 *
 * @name EmbeddedList.isEmpty(value, raw)
 * @param value - the parsed value for the field
 * @param raw - the raw value for this field
 * @api public
 */

EmbeddedList.prototype.isEmpty = function (value, raw) {
    return (value === '' || value === null || value === undefined);
};

/**
 * Detects embedded documents with missing _id properties and returns an
 * array of Error objects for each occurence. Returns an empty array if
 * all documents have a populated _id property.
 *
 * @name EmbeddedList.missingIDs(list)
 * @param {Array} list
 * @returns {Array}
 * @api public
 */

EmbeddedList.prototype.missingIDs = function (list) {
    var errs = [];
    _.each(list, function (v, i) {
        if (!v._id) {
            var e = new Error('Embedded document missing _id');
            e.field = [i];
            errs.push(e);
        }
    });
    return errs;
};

/**
 * Detects embedded documents with duplicate _id properties and returns an
 * array of Error objects for each occurence. Returns an empty array if
 * all documents have a unique _id property.
 *
 * @name EmbeddedList.duplicateIDs(list)
 * @param {Array} list
 * @returns {Array}
 * @api public
 */

EmbeddedList.prototype.duplicateIDs = function (list) {
    var ids = {};
    var errs = [];
    _.each(list, function (v, i) {
        if (v._id in ids) {
            var e = new Error('Embedded document duplicates an existing _id');
            e.field = [i];
            errs.push(e);
        }
        ids[v._id] = true;
    });
    return errs;
};

/**
 * Checks for missing or duplicate _ids then runs the type's validate function
 * against each embedded document. Returns an array of validation errors, or
 * an empty array if valid.
 *
 * @name EmbeddedList.validate(doc, value, raw)
 * @param {Object} doc
 * @param value
 * @param raw
 * @returns {Array}
 * @api public
 */

EmbeddedList.prototype.validate = function (doc, value, raw) {
    var type = this.type;

    // don't validate empty fields, but check if required
    if (this.isEmpty(value, raw)) {
        if (this.required) {
            return [ new Error('Required field') ];
        }
        return [];
    }

    // check all values are objects
    var non_objects = _.filter(value, function (v) {

        /* Workaround for interpreter bug:
            Saving embedList() data throws an error when running in a
            CouchDB linked against js-1.8.0. We encounter a situation where
            typeof(v) === 'object', but the 'v instanceof Object' test
            incorrectly returns false. We suspect an interpreter bug.
            Please revisit this using a CouchDB linked against js-1.8.5.
            We don't currently have the infrastructure for a test case. */
        
        /* Before: return !(v instanceof Object) || _.isArray(v); */
        return (typeof(v) !== 'object' || _.isArray(v));
    });
    if (non_objects.length) {
        return _.map(non_objects, function (v) {
            return new Error(v + ' is not an object');
        });
    }

    // check for missing ids
    var missing = this.missingIDs(value);
    if (missing.length) {
        return missing;
    }

    // check for duplicate ids
    var duplicates = this.duplicateIDs(value);
    if (duplicates.length) {
        return duplicates;
    }

    // run type validation against each embedded document
    return _.reduce(value, function (errs, v, i) {
        var r = raw ? raw[i]: undefined;
        return errs.concat(
            _.map(type.validate(v, r), function (err) {
                err.field = [i].concat(err.field || []);
                return err;
            })
        );
    }, []);
};

/**
 * Check relevant type permissions to see if user is authorised to make
 * changes. Returns an array of permissions errors, or an empty array if the
 * changes are permissible.
 *
 * @name EmbeddedList.authorize(nDoc, oDoc, nVal, oVal, user)
 * @param {Object} nDoc
 * @param {Object} oDoc
 * @param nVal
 * @param oVal
 * @param {Object} user
 * @returns {Array}
 * @api public
 */

EmbeddedList.prototype.authorize = function (nDoc, oDoc, nVal, oVal, user) {
    var type = this.type;
    var perms = this.permissions;

    nVal = nVal || [];
    oVal = oVal || [];

    // a unique list of embedded ids from both the old and new document
    var ids = _.uniq(_.pluck(nVal, '_id').concat(_.pluck(oVal, '_id')));

    return _.reduce(ids, function (errs, id, i) {

        var curr_errs = [];
        var nd = _.detect(nVal, function (v) {
            return v && v._id === id;
        });
        nd = nd || {_deleted: true};
        var od = _.detect(oVal, function (v) {
            return v && v._id === id;
        });
        var args = [nDoc, oDoc, nd, od, user];

        if (_.isFunction(perms)) {
            curr_errs = utils.getErrors(perms, args);
        }
        var fn;
        // on add
        if (nd && !od) {
            fn = perms.add;
        }
        // on remove
        else if (nd._deleted) {
            fn = perms.remove;
        }
        // on update
        else if (JSON.stringify(nd) !== JSON.stringify(od)) {
            fn = perms.update;
        }
        if (fn) {
            curr_errs = curr_errs.concat(utils.getErrors(fn, args));
        }
        curr_errs = _.map(curr_errs, function (e) {
            e.field = [i].concat(e.field || []);
            return e;
        });
        return errs.concat(curr_errs);

    }, []);
};


/**
 * Prepends a validator to an array of validator functions.
 *
 * @param {Array} arr
 * @param {Function} fn
 * @api private
 */

var prependValidator = function (options, fn) {
    options = options || {};
    options.validators = [fn].concat(options.validators || []);
    return options;
};


/**
 * Creates a new string Field
 *
 * @name string([options])
 * @param {Object} options
 * @api public
 */

exports.string = function (options) {
    return new Field(_.defaults((options || {}), {
        parse: function (raw) {
            if (raw === null || raw === undefined) {
                return '';
            }
            return '' + raw;
        }
    }));
};

/**
 * Creates a new password Field
 *
 * @name password([options])
 * @param {Object} options
 * @api public
 */

exports.password = function (options) {
    return new Field(_.defaults((options || {}), {
        widget: widgets.password(),
        parse: function (raw) {
            if (raw === null || raw === undefined) {
                return '';
            }
            return '' + raw;
        }
    }));
};

/**
 * Creates a new number Field
 *
 * @name number([options])
 * @param {Object} options
 * @api public
 */

exports.number = function (options) {
    options = prependValidator(options, function (doc, value) {
        if (isNaN(value)) {
            throw new Error('Not a number');
        }
    });
    return new Field(_.defaults((options || {}), {
        parse: function (raw) {
            if (raw === '' || raw === null || raw === undefined) {
                return NaN;
            }
            return Number(raw);
        }
    }));
};


/**
 * Creates a new boolean Field
 *
 * @name boolean([options])
 * @param {Object} options
 * @api public
 */

exports.boolean = function (options) {
    return new Field(_.defaults((options || {}), {
        widget: widgets.checkbox(),
        required: false,
        parse: Boolean
    }));
};


/**
 * Creates a URL Field
 *
 * @name url([options])
 * @param {Object} options
 * @api public
 */

exports.url = function (options) {
    options = prependValidator(options, validators.url());
    return exports.string(options);
};


/**
 * Creates an email Field
 *
 * @name email([options])
 * @param {Object} options
 * @api public
 */

exports.email = function (options) {
    options = prependValidator(options, validators.email());
    return exports.string(options);
};


/**
 * Creates a creator Field
 *
 * @name creator([options])
 * @param {Object} options
 * @api public
 */

exports.creator = function (options) {
    options = options || {};
    if (!options.permissions) {
        options.permissions = {};
    }
    var p = options.permissions;
    if (p.add) {
        p.add = permissions.all([
            permissions.matchUsername(),
            p.add
        ]);
    }
    else {
        p.add = permissions.matchUsername();
    }
    if (p.update) {
        p.update = permissions.all([
            permissions.fieldUneditable(),
            p.update
        ]);
    }
    else {
        p.update = permissions.fieldUneditable();
    }
    return exports.string(_.defaults(options, {
        required: false,
        widget: widgets.creator(),
        default_value: function (req) {
            return (req.userCtx && req.userCtx.name) || '';
        }
    }));
};


/**
 * Creates a createdTime timestamp Field
 *
 * @name createdTime([options])
 * @param {Object} options
 * @api public
 */

exports.createdTime = function (options) {
    options = options || {};
    if (!options.permissions) {
        options.permissions = {};
    }
    var p = options.permissions;
    if (p.update) {
        p.update = permissions.all([
            permissions.fieldUneditable(),
            p.update
        ]);
    }
    else {
        p.update = permissions.fieldUneditable();
    }
    return exports.number(_.defaults(options, {
        widget: widgets.computed(),
        default_value: function (req) {
            return new Date().getTime();
        }
    }));
};


/**
 * Creates a choice Field
 *
 * Required option: values - an array of possible choices, each an array
 * with the first item as the value and the second as its label.
 *
 * @name choice([options])
 * @param {Object} options
 * @api public
 */

exports.choice = function (options) {
    if (!options || !options.values) {
        throw new Error('No values defined');
    }
    options = prependValidator(options, function (doc, value) {
        for (var i = 0; i < options.values.length; i++) {
            if (value === options.values[i][0]) {
                return;
            }
        }
        throw new Error('Invalid choice');
    });
    // use value as label if no label defined
    options.values = _.map(options.values, function (v) {
        return _.isArray(v) ? v: [v, v];
    });
    return new Field(_.defaults(options, {
        widget: widgets.select({values: options.values})
    }));
};


/**
 * Creates a number choice Field
 *
 * @name numberChoice([options])
 * @param {Object} options
 * @api public
 */

exports.numberChoice = function (options) {
    options = options || {};
    prependValidator(options, function (doc, value) {
        if (isNaN(value)) {
            throw new Error('Not a number');
        }
    });
    return exports.choice(_.defaults(options, {
        parse: function (raw) {
            if (raw === null || raw === '') {
                return '';
            }
            return Number(raw);
        }
    }));
};


/**
 * Creates an Embedded Field
 *
 * Required option: type - the Type definition to embed
 *
 * @name embed([options])
 * @param {Object} options
 * @api public
 */

exports.embed = function (options) {
    return new Embedded(_.defaults((options || {}), {
        widget: widgets.embedList({
            singleton: true,
            widget: widgets.defaultEmbedded()
        })
    }));
};


/**
 * Creates an EmbeddedList Field
 *
 * Required option: type - the Type definition to embed
 *
 * @name embedList([options])
 * @param {Object} options
 * @api public
 */

exports.embedList = function (options) {
    return new EmbeddedList(_.defaults((options || {}), {
        widget: widgets.embedList({
            singleton: false,
            widget: widgets.defaultEmbedded()
        })
    }));
};


/**
 * Creates a array Field. The default parse function expects a single row of
 * comma separated values.
 *
 * To accept an array of values other than strings, add a function to options
 * called parseEach which accepts the string value for each item and performs
 * the transformation.
 *
 * @name array([options])
 * @param {Object} options
 * @api public
 */

exports.array = function (options) {
    options = options || {};
    options.hint = options.hint || "Values should be comma separated";
    prependValidator(options, function (doc, value) {
        if (!_.isArray(value)) {
            throw new Error('Not an array');
        }
    });
    return exports.string(_.defaults(options, {
        parse: function (raw) {
            var result = utils.parseCSV(raw || '')[0] || [];
            if (options.parseEach) {
                result = _.map(result, options.parseEach);
            }
            return result;
        }
    }));
};

/**
 * Creates a number array Field, same as the array field only each value is
 * parsed as a number instead of a string.
 *
 * @name numberArray([options])
 * @param {Object} options
 * @api public
 */

exports.numberArray = function (options) {
    options = options || {};
    options.parseEach = options.parseEach || function (v) {
        return Number(v);
    };
    prependValidator(options, function (doc, value) {
        for (var i = 0, len = value.length; i < len; i++) {
            if (isNaN(value[i])) {
                throw new Error('Not a number');
            }
        }
    });
    return exports.array(options);
};


/**
 * AttachmentField objects are used when constructing content types and forms,
 * and are handled slightly differently than Field objects when parsing requests
 * and validating.
 *
 * AttachmentField 'inherits' from Field (so an AttachmentField object will
 * return true for instanceof Field and instanceof AttachmentField).
 *
 * #### Options ####
 *
 * * **omit_empty**  *Boolean* - whether to omit the field from a document when
 *                               the field is empty
 * * **permissions** *Object*  - a permissions check function or an object
 *                               containing separate functions to run on create,
 *                               edit and update operations.
 * * **validators**  *Array*   - an array of validation functions (default: [])
 * * **required**    *Boolean* - whether the field is required (default: true)
 *
 * @constructor
 * @name Field
 * @param {Object} options
 * @api public
 */

exports.AttachmentField = function AttachmentField(options) {
    exports.Field.call(this, options);
};
exports.AttachmentField.prototype = new exports.Field();


/**
 * Creates a file attachment field.
 *
 * @name attachment([options])
 * @param {Object} options
 * @api public
 */

exports.attachments = function (options) {
    options = options || {};
    options.widget = options.widget || widgets.file();
    return new exports.AttachmentField(options);
};
