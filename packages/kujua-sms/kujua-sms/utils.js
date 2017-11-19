/*
 * Utility functions for Medic Mobile
 */
var utils = require('kujua-utils'),
    logger = utils.logger,
    _ = require('underscore');

/**
 * Determine locale/language of a record based on a locale value:
 *  - Set on the document
 *  - Reported in a form field named `locale`
 *  - Configured in the gateway and set on message post
 *  - Configured in the settings
 *  - Defaults to 'en'
 */
function getLocale(record) {
    return record.locale ||
           (record.fields && record.fields.locale) ||
           (record.sms_message && record.sms_message.locale) ||
           exports.info.locale ||
           'en';
}

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
