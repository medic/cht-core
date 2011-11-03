/**
 * Functions for the rendering, parsing and validation of forms.
 *
 * @module
 */

/**
 * Module dependencies
 */

var utils = require('couchtypes/utils'),
    fieldset = require('couchtypes/fieldset'),
    render = require('./render'),
    _ = require('underscore')._;


/**
 * Form object, presents fields and parses responses.
 *
 * #### Options ####
 *
 * <table class="options">
 *   <tr>
 *      <td class="name">exclude</td>
 *      <td class="type">Array</td>
 *      <td class="description">a list of field names to exclude</td>
 *   </tr>
 *   <tr>
 *      <td class="name">fields</td>
 *      <td class="type">Array</td>
 *      <td class="description">
 *          a subset of fields to use (inverse of excluded)
 *      </td>
 *   </tr>
 * </table>
 *
 * @name Form(fields | type, [doc])
 * @param {Object} fields  - an object literal containing fields or a Type
 * @param {Object} doc     - (optional) the original document being edited
 * @param {Object} options - (optional) see available options above
 * @constructor
 * @api public
 */

var Form = exports.Form = function Form(fields, doc, options) {
    this.options = options || {};

    this.values = null;
    if (doc) {
        this.values = JSON.parse(JSON.stringify(doc)); /* Copy */
        this.initial_doc = doc;
    }
    if (fields && fields.fields) {
        this.type = fields;
        this.fields = this.type.fields;
    }
    else {
        this.fields = fields;
    }
    /*if (utils.constructorName(fields) === 'Type') {
        this.type = fields;
        this.fields = this.type.field;
    }
    else {
        this.fields = fields;
    }*/
};


/**
 * Overrides values in doc_a with values in doc_b, only when a field is present
 * for that value. This means properties not in fields (or in excluded fields)
 * are retained, while properties which are covered by the fieldset are
 * replaced.
 *
 * This is used when updating the form's values with a request when its been
 * initiated with a previous document. You shouldn't normally need to call this
 * directly.
 *
 * Returns the updated doc_a object.
 *
 * @name override(excludes, field_subset, fields, doc_a, doc_b, path)
 * @param {Array | null} excludes
 * @param {Array | null} field_subset
 * @param {Object} Fields
 * @param {Object} doc_a
 * @param {Object} doc_b
 * @param {Array} path
 * @returns {Object}
 * @api public
 */

exports.override = function (excludes, field_subset, fields, doc_a, doc_b, path) {
    fields = fields || {};
    doc_a = doc_a || {};

    var fields_module = require('./fields');
    var exclude_paths = _.map((excludes || []), function (p) {
        return p.split('.');
    });
    var subset_paths = _.map((field_subset || []), function (p) {
        return p.split('.');
    });

    var keys = _.keys(doc_b);

    _.each(keys, function (k) {
        if (path.length === 0 && k === '_attachments') {
            return;
        }
        var f = fields[k];
        var b = doc_b[k];
        var f_path = path.concat([k]);

        if (typeof b !== 'object' ||
            f instanceof fields_module.Field ||
            f instanceof fields_module.Embedded ||
            f instanceof fields_module.EmbeddedList) {

            if (excludes) {
                for (var i = 0; i < exclude_paths.length; i++) {
                    if (utils.isSubPath(exclude_paths[i], f_path)) {
                        return;
                    }
                }
            }
            if (field_subset) {
                var in_subset = false;
                for (var j = 0; j < subset_paths.length; j++) {
                    if (utils.isSubPath(subset_paths[j], f_path)) {
                        in_subset = true;
                    }
                }
                if (!in_subset) {
                    return;
                }
            }
            doc_a[k] = b;
        }
        else {
            doc_a[k] = exports.override(
                excludes, field_subset, fields[k], doc_a[k], b, f_path
            );
        }
    });
    if (path.length === 0) {
        return exports.overrideAttachments(
            excludes, field_subset, fields, doc_a, doc_b
        );
    }
    return doc_a;
};

exports.overrideAttachments = function (excludes, field_subset, fields, doc_a, doc_b) {
    var exclude_paths = _.map((excludes || []), function (p) {
        return p.split('.');
    });
    var subset_paths = _.map((field_subset || []), function (p) {
        return p.split('.');
    });

    var a = doc_a._attachments || {};
    var b = doc_b._attachments || {};

    var a_keys = _.keys(a);
    var b_keys = _.keys(b);
    var all_keys = _.uniq(a_keys.concat(b_keys).sort(), true);

    var fields_module = require('./fields');

    _.each(all_keys, function (k) {
        var parts = k.split('/');
        var filename = parts.pop();
        var dir = parts.join('/');
        var f = utils.getPropertyPath(fields, dir);


        if (f instanceof fields_module.AttachmentField) {
            if (excludes) {
                for (var i = 0; i < exclude_paths.length; i++) {
                    if (utils.isSubPath(exclude_paths[i], dir.split('/'))) {
                        return;
                    }
                }
            }
            if (field_subset) {
                var in_subset = false;
                for (var j = 0; j < subset_paths.length; j++) {
                    if (utils.isSubPath(subset_paths[j], dir.split('/'))) {
                        in_subset = true;
                    }
                }
                if (!in_subset) {
                    return;
                }
            }
            // clear existing attachments
            for (var ak in a) {
                if (ak.slice(0, dir.length + 1) === dir + '/') {
                    delete a[ak];
                }
            }
            // copy over new attachments
            for (var bk in b) {
                if (bk.slice(0, dir.length + 1) === dir + '/') {
                    if (!doc_a._attachments) {
                        a = doc_a._attachments = {};
                    }
                    a[bk] = b[bk];
                }
            }
        }
        else if (b.hasOwnProperty(k)) {
            if (!doc_a._attachments) {
                a = doc_a._attachments = {};
            }
            a[k] = b[k];
        }
    });

    return doc_a;
};

/**
 * Parses a request and validates the result, binding values and errors to
 * the form instance.
 *
 * @name Form.validate(req)
 * @param {Object} req
 * @returns {Form}
 * @api public
 */

Form.prototype.validate = function (req) {
    /* This is the request payload:
        This contains all of the form fields that are used by
        formValuesToTree and parseRaw, and must be copied first. */

    this.raw = (req.form || {});

    var type_class = require('./types').Type;
    var tree = exports.formValuesToTree(this.raw);

    this.values = exports.override(
        this.options.exclude,
        this.options.fields,
        this.fields,
        this.values || fieldset.createDefaults(this.fields, req) || {},
        exports.parseRaw(this.fields, tree),
        []
    );

    this.errors = fieldset.validate(
        this.fields, this.values, this.values, this.raw, [], false
    );

    if (this.type) {
        if (this.type instanceof type_class) {
            // run top level permissions first
            var type_errs = this.type.authorizeTypeLevel(
                this.values, this.initial_doc, req.userCtx
            );
            if (type_errs.length) {
                this.errors = this.errors.concat(type_errs);
            }
            else {
                // if no top-level permissions errors, check each field
                this.errors = this.errors.concat(
                    this.type.authorize(
                        this.values, this.initial_doc, req.userCtx
                    )
                );
            }
        } else {
            /* Programmer error: display a useful diagnostic message */
            throw new Error(
                'Encountered a type object that is not an instance of' +
                    ' `Type`; check lib/types.js for proper instansiation'
            );
        }

    }
    else {
        this.errors = this.errors.concat(fieldset.authFieldSet(
            this.fields, this.values, this.initial_doc, this.values,
            this.initial_doc, req.userCtx, [], true
        ));
    }

    // clear field properties on errors for excluded fields
    var excludes = this.options.exclude;
    if (excludes) {
        var excl_paths = _.map(excludes, function (p) {
            return p.split('.');
        });
        this.errors = _.map(this.errors, function (e) {
            if (!e.field) {
                return e;
            }
            for (var i = 0, len = excl_paths.length; i < len; i++) {
                var path = excl_paths[i];
                if (utils.isSubPath(path, e.field)) {
                    e.message = e.field.join('.') + ': ' + (
                        e.message || e.toString()
                    );
                    delete e.field;
                    return e;
                }
            }
            return e;
        });
    }

    // clear field properties on errors not in fields subset
    var field_subset = this.options.fields;
    if (field_subset) {
        var subset_paths = _.map(field_subset, function (p) {
            return p.split('.');
        });
        this.errors = _.map(this.errors, function (e) {
            if (!e.field) {
                return e;
            }
            for (var i = 0, len = subset_paths.length; i < len; i++) {
                var path = subset_paths[i];
                if (!utils.isSubPath(path, e.field)) {
                    e.message = e.field.join('.') + ': ' + (
                        e.message || e.toString()
                    );
                    delete e.field;
                    return e;
                }
            }
            return e;
        });
    }

    return this;
};

/**
 * After a form has called validate, this function will return true if the form
 * is valid, false otherwise.
 *
 * @name Form.isValid()
 * @returns {Boolean}
 * @api public
 */

Form.prototype.isValid = function () {
    return !(this.errors && this.errors.length);
};

/**
 * Filters an array of errors, returning only those below a specific field path
 *
 * @param {Array} errs
 * @param {Array} path
 * @returns {Array}
 */

var errsBelowPath = function (errs, path) {
    if (!path || !path.length) {
        return errs;
    }
    return _.filter(errs, function (e) {
        if (!e.field) {
            return false;
        }
        return utils.isSubPath(path, e.field);
    });
};

/**
 * Filters a list of errors, returning only those without a field property.
 * This is used to populate the errors at the top of the form, which apply
 * generally, or cannot be attributed to a single field.
 *
 * @param {Array} errs
 * @returns {Array}
 */

var errsWithoutFields = function (errs) {
    return _.filter(errs, function (e) {
        return !e.field;
    });
};

/**
 * Converts current form to a HTML string, using an optional renderer class.
 *
 * @name Form.toHTML(req, [RendererClass])
 * @param {Object} req Request object; null for most recent. (optional)
 * @param {Renderer} RendererClass (optional)
 * @param {Object} options An object containing widget options, which
 *          will ultimately be provided to each widget's toHTML method.
 * @param {Boolean} create_defaults (optional) Set this to true if you've
 *          provided a document in {doc}, but would still like default
 *          values to be merged in to it via createDefaults. For a field f,
 *          the default value is added to {doc} if and only if doc[f]
 *          is undefined, null, or not present. Defaults to off.
 * @returns {String}
 * @returns {String}
 * @api public
 */

Form.prototype.toHTML = function (req,
                                  /* optional */ RendererClass,
                                  /* optional */ options,
                                  /* optional */ create_defaults) {
    var values = this.values;

    options = options || {};
    options.operation = options.operation || (values ? 'update': 'add');

    if (create_defaults) {
        values = _.defaults(
            values, fieldset.createDefaults(this.fields, req)
        );
    } else if (!values) {
        values = fieldset.createDefaults(this.fields, req);
    }

    RendererClass = (RendererClass || render.defaultRenderer());
    var renderer = new RendererClass();
    return (
        renderer.start(
            errsWithoutFields(this.errors)
        ) +
        this.renderFields(
            renderer, this.fields, values, this.raw, this.errors, [], options
        ) +
        renderer.end() +
        render.scriptTagForEvent('renderFinish')
    );
};

/**
 * Filters an array of errors, returning only those below a specific field path
 *
 * @param {Array} errs
 * @param {Array} path
 * @returns {Array}
 */

var errsBelowPath = function (errs, path) {
    return _.filter(errs, function (e) {
        for (var i = 0, len = path.length; i < len; ++i) {
            if (!e.field || path[i] !== e.field[i]) {
                return false;
            }
        }
        return true;
    });
};

/**
 * Iterates over fields and sub-objects calling the correct renderer function on
 * each. Returns a HTML representation of the fields. Used internally by the
 * toHTML method, you should not need to call this function directly.
 *
 * @name Form.renderFields(renderer, fields, values, raw, err, path)
 * @param {Object} renderer
 * @param {Object} fields
 * @param {Object} values
 * @param {Array} errs
 * @param {Array} path
 * @param {Object} options An object containing widget options, which
 *          will ultimately be provided to each widget's toHTML method.
 * @returns {String}
 * @api public
 */

Form.prototype.renderFields = function (renderer, fields, values,
                                        raw, errs, path, options, root) {
    fields = fields || {};
    values = values || {};
    root = root || values;
    raw = raw || {};
    errs = errs || [];
    path = path || [];

    var that = this;
    var excludes = this.options.exclude;
    var field_subset = this.options.fields;
    var keys = _.keys(fields);

    var fields_module = require('./fields');

    return _.reduce(keys, function (html, k) {

        var f_path = path.concat([k]);

        if (excludes) {
            if (_.indexOf(excludes, f_path.join('.')) !== -1) {
                return html;
            }
        }
        if (field_subset) {
            if (_.indexOf(field_subset, f_path.join('.')) === -1) {
                return html;
            }
        }

        var f_errs = errsBelowPath(errs, f_path);
        var f = fields[k];

        if (f instanceof fields_module.AttachmentField) {
            return html + renderer.field(
                f,
                f_path,
                utils.attachmentsBelowPath(root, f_path),
                (raw[k] === undefined) ? values[k]: raw[k],
                f_errs,
                (options || {})
            );
        }
        else if (f instanceof fields_module.Field ||
                 f instanceof fields_module.Embedded ||
                 f instanceof fields_module.EmbeddedList) {

            return html + renderer.field(
                f,
                f_path,
                values[k],
                (raw[k] === undefined) ? values[k]: raw[k],
                f_errs,
                (options || {})
            );
        }
        else if (f instanceof Object) {
            return html + (k ? renderer.beginGroup(f_path) : '') +
                that.renderFields(
                    renderer,
                    f,
                    values[k],
                    (raw[k] === undefined) ? values[k]: raw[k],
                    errs,
                    f_path,
                    (options || {}),
                    root
                ) + (k ? renderer.endGroup(f_path) : '');
        } else {
            throw new Error(
                'The field type `' + (typeof f) + '` is not supported.'
            );
        }
    }, '');
};


/**
 * Transforms a flat object from a request query to a proper
 * hierarchy of properties.
 *
 * <pre>{'one.two': 'val'} --> {one: {two: 'val'}}</pre>
 *
 * @name formValuesToTree(form)
 * @param {Object} query
 * @api public
 */

exports.formValuesToTree = function (form) {
    var tree = {};
    for (var k in form) {
        utils.setPropertyPath(tree, k.split('.'), form[k]);
    }
    return tree;
};


/**
 * Transforms a raw query object from formValuesToTree to a
 * document which follows the schema for the given type.
 *
 * @name parseRaw(fields, raw)
 * @param {Object} fields
 * @param {Object} raw
 * @returns {Object}
 * @api public
 */

exports.parseRaw = function (fields, raw, root, path) {
    var doc = {};
    path = path || [];
    root = root || doc;
    raw = raw || {};
    var fields_module = require('./fields');

    for (var k in fields) {
        var f = fields[k];
        var f_path = path.concat([k]);
        var r = raw[k];

        if (f instanceof fields_module.AttachmentField) {
            if (typeof r === 'string' && r !== '') {
                r = JSON.parse(r);
            }
            else {
                r = {};
            }
            var att = {};
            for (var rk in r) {
                att[f_path.join('/') + '/' + rk] = r[rk];
            }
            if (!root._attachments) {
                root._attachments = {};
            }
            _.extend(root._attachments, att);
        }
        else if (f instanceof fields_module.Field) {
            if (!f.isEmpty(r)) {
                doc[k] = f.parse(r);
            }
            else if (!f.omit_empty) {
                doc[k] = undefined;
            }
        }
        else if (f instanceof fields_module.Embedded) {
            if (!f.isEmpty(r)) {
                if (typeof r === 'string') {
                    if (r !== '') {
                        r = JSON.parse(r);
                    } else {
                        r = {};
                    }
                }
                doc[k] = exports.parseRaw(f.type.fields, r, root, f_path);
            }
        }
        else if (f instanceof fields_module.EmbeddedList) {
            doc[k] = [];
            if (!f.isEmpty(r)) {
                for (var i in r) {
                    if (typeof r[i] === 'string') {
                        if (r[i] !== '') {
                            r[i] = JSON.parse(r[i]);
                        } else {
                            r[i] = {};
                        }
                    }
                    doc[k][i] = exports.parseRaw(
                        f.type.fields, r[i], root, f_path.concat([i])
                    );
                }
            }
            if (!doc[k].length && f.omit_empty) {
                delete doc[k];
            }
        }
        else if (f instanceof Object) {
            doc[k] = exports.parseRaw(f, r, root, f_path);
        } else {
            throw new Error(
                'The field type `' + (typeof f) + '` is not supported.'
            );
        }
    }
    return doc;
};

