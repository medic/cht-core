/**
 * Document types can be used to ease the validation of updates and check
 * permissions when creating, editing or deleting documents.
 *
 * @module
 */


/**
 * Module dependencies
 */

var utils = require('./utils'),
    db = require('db'),
    fields = require('couchtypes/fields'),
    fieldset = require('couchtypes/fieldset'),
    widgets = require('couchtypes/widgets'),
    permissions = require('couchtypes/permissions'),
    _ = require('underscore')._;


/**
 * Creates a new Type object
 *
 * #### Options ####
 *
 * * **fields**       *Object* - Field objects to use as the Types's schema
 * * **permissions**  *Object* - a permissions check function or an object
 *                    containing separate functions to run on add, remove
 *                    and update operations.
 * * **display_name** *Function|String|Array* - name to be used when displaying
 *                    the document in the admin tool. A string or array
 *                    will become the property to display. A function
 *                    should take the document as a object and return
 *                    the display name.
 *
 * @name Type(name, options)
 * @param {Object} options
 * @constructor
 * @api public
 */

var Type = exports.Type = function Type(name, options) {
    if (typeof name !== 'string') {
        throw new Error('First argument must be the type name');
    }
    this.name = name;
    options = options || {};

    var f = {};
    f._id = fields.string({
        omit_empty: true,
        required: false,
        widget: widgets.hidden(),
        permissions: {
            update: permissions.fieldUneditable()
        },
        default_value: function (req) {
            return req.uuid;
        }
    });
    f._rev = fields.string({
        omit_empty: true,
        required: false,
        widget: widgets.hidden()
    });
    f._deleted = fields.boolean({
        omit_empty: true,
        required: false,
        widget: widgets.hidden()
    });
    f.type = fields.string({
        default_value: name,
        widget: widgets.hidden(),
        validators: [
            function (doc, val, raw) {
                if (val !== name) {
                    throw new Error('Unexpected value for type');
                }
            },
        ]
    });
    for (var k in options.fields) {
        if (options.fields.hasOwnProperty(k)) {
            f[k] = options.fields[k];
        }
    }

    options.fields = f;
    _.extend(this, _.defaults(options, {
        permissions: []
    }));

    if (options.display_name) {
        if (typeof options.display_name !== 'function') {
            this.display_name = function (doc) {
                if (typeof options.display_name === 'string') {
                    options.display_name = [options.display_name];
                }
                return utils.getPropertyPath(doc, options.display_name);
            };
        }
    }
};

/**
 * Run field validators against document and check for missing required
 * fields or extra fields when the Types's allow_extra_fields property is
 * set to false.
 *
 * @name Type.validate(doc, rawDoc)
 * @param {Object} doc
 * @param {Object} rawDoc
 * @returns {Array}
 * @api public
 */

Type.prototype.validate = function (doc, rawDoc) {
    rawDoc = rawDoc || doc;
    return fieldset.validate(
        this.fields,
        doc,
        doc,
        rawDoc,
        [],
        this.allow_extra_fields
    );
};


/**
 * Run field permissions checks against userCtx and document.
 *
 * @name Type.authorize(nDoc, oDoc, user)
 * @param {Object} nDoc - new document
 * @param {Object} oDoc - old document
 * @param {Object} userCtx - user context object
 * @returns {Array}
 * @api public
 */

Type.prototype.authorize = function (nDoc, oDoc, user) {
    var errs = this.authorizeTypeLevel(nDoc, oDoc, user);
    return errs.concat(fieldset.authFieldSet(
        this.fields, nDoc, oDoc, nDoc, oDoc, user, [], this.allow_extra_fields
    ));
};

/**
 * Runs top type-level permissions checks only.
 *
 * @name Type.authorizeTypeLevel(nDoc, oDoc, user)
 * @param {Object} nDoc - new document
 * @param {Object} oDoc - old document
 * @param {Object} userCtx - user context object
 * @returns {Array}
 * @api public
 */

Type.prototype.authorizeTypeLevel = function (nDoc, oDoc, user) {
    var perms = this.permissions;
    var errs = [];
    if (_.isFunction(perms)) {
        errs = errs.concat(
            utils.getErrors(perms, [nDoc, oDoc, null, null, user])
        );
    }
    // on update
    var fn = perms.update;
    // on add
    if (nDoc && !oDoc) {
        fn = perms.add;
    }
    // on remove
    else if (!nDoc || nDoc._deleted) {
        fn = perms.remove;
    }
    if (fn) {
        errs = errs.concat(
            utils.getErrors(fn, [nDoc, oDoc, null, null, user])
        );
    }
    return errs;
};

/**
 * Create's a new object for this Type. Pre-filling any default values and
 * providing a new _id value. This is a convenient function to use when creating
 * a type to embed within another.
 *
 * @name Type.create(userCtx, callback)
 * @param {Object} userCtx
 * @param {Function} callback
 * @api public
 */

Type.prototype.create = function (userCtx, callback) {
    var doc = fieldset.createDefaults(this.fields, {userCtx: userCtx});
    db.newUUID(100, function (err, uuid) {
        if (err) {
            return callback(err);
        }
        doc._id = uuid;
        callback(null, doc);
    });
};

/**
 * Calls validation and permissions functions relevant to a document update.
 * This should be called from your app's exported validate_doc_update function
 * if you wish to use kanso Types in you project.
 *
 * Throws on error.
 *
 * @name validate_doc_update(types, newDoc, oldDoc, userCtx)
 * @param {Object} types
 * @param {Object} newDoc
 * @param {Object} oldDoc
 * @param {Object} userCtx
 * @api public
 */

exports.validate_doc_update = function (types, newDoc, oldDoc, userCtx) {
    var type = (oldDoc && oldDoc.type) || newDoc.type;
    if (type && types[type]) {
        var t = types[type];
        if (!newDoc._deleted) {
            var validation_errors = t.validate(newDoc);
            if (validation_errors.length) {
                var err = validation_errors[0];
                var msg = err.message || err.toString();
                if (err.field && err.field.length) {
                    msg = err.field.join('.') + ': ' + msg;
                }
                throw {forbidden: msg};
            }
        }
        var permissions_errors = t.authorize(newDoc, oldDoc, userCtx);
        if (permissions_errors.length) {
            var err2 = permissions_errors[0];
            var msg2 = err2.message || err2.toString();
            if (err2.field && err2.field.length) {
                msg2 = err2.field.join('.') + ': ' + msg2;
            }
            throw {unauthorized: msg2};
        }
        if (t.validate_doc_update) {
            t.validate_doc_update(newDoc, oldDoc, userCtx);
        }
    }
};

/**
 * This type wraps a reference to a document. The _id attribute is
 * auto-generated as usual; the id of the document being referred to
 * is stored in the 'ref' attribute. In lists, this has the effect of
 * allowing multiple references to a single document.
 */

exports.reference = function (options) {
    if (!(options.type instanceof Type)) {
        throw new Error(
            'reference: The `type` option was not specified,' +
                'or is not an instance of the `Type` class.'
        );
    }
    var type = new Type('reference', {
        fields: {
            ref: fields.string({
                omit_empty: true,
                required: !!options.required,
                widget: widgets.hidden(),
                permissions: {},
                default_value: function (req) {
                    return undefined;
                }
            })
        }
    });
    type.type = options.type;
    return type;
};

/**
 * This type wraps a reference to a document. The _id attribute is
 * made writeable, and is used to store the id of the document being
 * referred to. In lists, has the effect of constraining each reference
 * to appear no more than once.
 */

exports.uniqueReference = function (options) {
    if (!(options.type instanceof Type)) {
        throw new Error(
            'uniqueReference: The `type` option was not specified,' +
                'or is not an instance of the `Type` class.'
        );
    }
    var type = new Type('unique_reference', {
        fields: {}
    });
    type.fields._id = fields.string({
        omit_empty: true,
        required: !!options.required,
        widget: widgets.hidden(),
        permissions: {},
        default_value: function (req) {
            return req.uuid;
        }
    });
    type.type = options.type;
    return type;
};
