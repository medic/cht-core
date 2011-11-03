/**
 * Functions for dealing with collections of fields. Used by both the
 * types and forms modules.
 *
 * @module
 */

/**
 * Module dependencies
 */

var _ = require('underscore')._,
    utils = require('couchtypes/utils');


/**
 * Returns a hierachy of default values for a given set of Field objects
 *
 * @name createDefaults(fields, req)
 * @param {Object} fields
 * @param {Object} req - the request object to pass to default_value functions
 * @returns {Object}
 * @api public
 */

exports.createDefaults = function (fields, req, doc, path) {
    path = path || [];
    var fields_module = require('./fields');
    return _.reduce(_.keys(fields), function (result, k) {
        var f = fields[k];
        if (f instanceof fields_module.AttachmentField) {
            if (f.hasOwnProperty('default_value')) {
                var val,
                    dir = path.concat([k]).join('/');
                if (_.isFunction(f.default_value)) {
                    val = f.default_value(req);
                }
                else {
                    val = f.default_value;
                }
                var d = doc || result;
                if (!d._attachments) {
                    d._attachments = {};
                }
                for (var ak in val) {
                    d._attachments[dir + '/' + ak] = val[ak];
                }
            }
        }
        else if (f instanceof fields_module.Field ||
                 f instanceof fields_module.Embedded ||
                 f instanceof fields_module.EmbeddedList) {

            if (f.hasOwnProperty('default_value')) {
                if (_.isFunction(f.default_value)) {
                    result[k] = f.default_value(req);
                }
                else {
                    result[k] = f.default_value;
                }
            }
        }
        else if (f instanceof Object) {
            result[k] = exports.createDefaults(
                f, req, doc || result, path.concat([k])
            );
        } else {
            throw new Error(
                'The field type `' + (typeof f) + '` is not supported.'
            );
        }
        return result;
    }, {});
};

/**
 * Validate a specific field, returning all validation errors as an array with
 * each error's field property prefixed by the current path.
 *
 * @name validateField(field, doc, value, raw, path)
 * @param {Field} field
 * @param {Object} doc
 * @param value
 * @param raw
 * @param {Array} path
 * @returns {Array}
 * @api public
 */

exports.validateField = function (field, doc, value, raw, path) {
    return _.map(field.validate(doc, value, raw), function (err) {
        err.field = path.concat(err.field || []);
        err.has_field = true;
        return err;
    });
};

/**
 * Validates an object containing fields or other sub-objects, iterating over
 * each property and recursing through sub-objects to find all Fields.
 *
 * Returns an array of validation errors, each with a field property set to the
 * path of the field which caused the error.
 *
 * @name validate(fields, doc, values, raw, path, extra)
 * @param {Object} fields
 * @param {Object} doc
 * @param {Object} values
 * @param {Object} raw
 * @param {Array} path
 * @param {Boolean} extra - whether to allow extra values not covered by a field
 * @returns {Array}
 * @api public
 */

exports.validate = function (fields, doc, values, raw, path, extra) {
    values = values || {};
    fields = fields || {};
    raw = raw || {};

    // Expecting sub-object, not a value
    if (typeof values !== 'object') {
        var e = new Error('Unexpected property - validation 1');
        e.field = path;
        e.has_field = false;
        return [e];
    }

    // Ensure we walk through all paths of both fields and values by combining
    // the keys of both. Otherwise, we might miss out checking for missing
    // required fields, or may not detect the presence of extra fields.

    var keys = _.uniq(_.keys(fields).concat(_.keys(values)));
    var fields_module = require('./fields');

    return _.reduce(keys, function (errs, k) {
        var f = fields[k];
        if (f === undefined) {
            // Extra value with no associated field detected
            if (!extra) {
                // ignore system properties
                if (!(path.length === 0 && k.charAt(0) === '_')) {
                    var e = new Error('Unexpected property - validation 2');
                    e.field = path.concat([k]);
                    e.has_field = false;
                    errs.push(e);
                }
            }
            return errs;
        }
        var val = values[k];
        var fn = exports.validate;
        if (f instanceof fields_module.Field ||
            f instanceof fields_module.Embedded ||
            f instanceof fields_module.EmbeddedList) {
            fn = exports.validateField;
        }
        if (f instanceof fields_module.AttachmentField) {
            val = utils.attachmentsBelowPath(doc, path.concat([k]));
        }
        return errs.concat(
            fn.call(this, f, doc, val, raw[k], path.concat([k]), extra)
        );
    }, []);
};

/**
 * Authorize a specific field, returning all permissions errors as an array with
 * each error's field property prefixed by the current path.
 *
 * @name authField(f, nDoc, oDoc, nVal, oVal, user, path)
 * @param {Field} f     - field object
 * @param {Object} nDoc - new document
 * @param {Object} oDoc - old document
 * @param nVal          - new field value
 * @param oVal          - old field value
 * @param {Object} user - user context object
 * @param {Array} path  - current path
 * @returns {Array}
 * @api public
 */

exports.authField = function (f, nDoc, oDoc, nVal, oVal, user, path) {
    //log('authField: ' + path.join('.'));
    return _.map(f.authorize(nDoc, oDoc, nVal, oVal, user), function (err) {
        err.field = path.concat(err.field || []);
        err.has_field = true;
        return err;
    });
};

/**
 * Authorizes an object containing fields or other sub-objects, iterating over
 * each property and recursing through sub-objects to find all Fields.
 *
 * Returns an array of permissions errors, each with a field property set to the
 * path of the field which caused the error.
 *
 * @name authFieldSet(f, nDoc, oDoc, nVal, oVal, user, path)
 * @param {Field} f     - field object
 * @param {Object} nDoc - new document
 * @param {Object} oDoc - old document
 * @param nVal          - new field value
 * @param oVal          - old field value
 * @param {Object} user - user context object
 * @param {Array} path  - current path
 * @param {Boolean} extra - whether to raise an error on additional fields
 * @returns {Array}
 * @api public
 */

exports.authFieldSet = function (f, nDoc, oDoc, nVal, oVal, user, path, extra) {
    //log('authFieldSet: ' + path.join('.'));
    nVal = nVal || {};
    oVal = oVal || {};
    f = f || {};

    // Expecting sub-object, not a value
    // This *should* be picked up by validation, and be raised as a validation
    // error before it gets to the auth stage
    if (typeof nVal !== 'object') {
        var e = new Error('Unexpected property 1');
        e.field = path;
        e.has_field = false;
        return [e];
    }

    // Ensure we walk through all paths of both fields and values by combining
    // the keys of both. Otherwise, we might miss out checking for missing
    // required fields, or may not detect the presence of extra fields.

    var fKeys = _.keys(f);
    var newKeys = _.keys(nVal);
    var oldKeys = _.keys(oVal);
    var keys = _.uniq(fKeys.concat(newKeys).concat(oldKeys));

    var fields_module = require('./fields');

    return _.reduce(keys, function (errs, k) {
        var field = f[k];
        if (field === undefined) {
            // Extra value with no associated field detected
            // This *should* be picked up by validation, and be raised as a
            // validation error before it gets to the auth stage
            if (!extra) {
                // ignore system properties
                if (!(path.length === 0 && k.charAt(0) === '_')) {
                    var e = new Error('Unexpected property 2');
                    e.field = path.concat([k]);
                    e.has_field = false;
                    errs.push(e);
                }
            }
            return errs;
        }
        var fn = exports.authFieldSet;
        var nv = nVal[k];
        var ov = oVal[k];
        if (field instanceof fields_module.Field ||
            field instanceof fields_module.Embedded ||
            field instanceof fields_module.EmbeddedList) {
            fn = exports.authField;
        }
        if (field instanceof fields_module.AttachmentField) {
            nv = utils.attachmentsBelowPath(nDoc, path.concat([k]));
            ov = utils.attachmentsBelowPath(oDoc, path.concat([k]));
        }
        return errs.concat(fn(
            field, nDoc, oDoc, nv, ov, user, path.concat([k]), extra
        ));
    }, []);
};

