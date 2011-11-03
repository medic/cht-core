/*global $: false, kanso: true*/

/**
 * Implementation of widget actions. These are procedures
 * that can be referenced by widgets to present/collect information,
 * manipulate the DOM, or otherwise affect the application state
 * when a widget is acted upon.
 *
 * @module
 */

/**
 * Module dependencies
 */

var core = require('./actions.core'),
    db = require('db'),
    utils = require('couchtypes/utils'),
    _ = require('underscore')._,
    duality;


try {
    duality = require('duality/core');
}
catch (e) {
    // may not be available
}


/**
 * Update the action originator (i.e. a widget) with a new value.
 * If the originating widget is not widget.embedList, it must provide
 * a setListItemValue method, which accepts three arguments -- (i) a DOM
 * element that wraps the widget; (ii) the new value for the widget; and
 * (iii) a set of widget options, which sometimes contains information
 * about the widget's nesting context and/or list item offset. It's
 * important to note that this action doesn't cause any data to be
 * saved on its own, but merely updates a widget's value for use
 * in the next save operation.
 */

exports.defaultEmbedSave = function (action_options, names, 
                                     data, options, callback) {
    if (!data.element) {
        return callback(false, data.value);
    }

    var widget = utils.getPropertyPath(data, [ 'field', 'widget' ]);
    var item_elt = $(data.element).closest('.item');

    widget.setListItemValue(
        item_elt, data.value, options
    );

    return callback(true, data.value);
};


/**
 * Saves the document specified in data.value. This action is
 * intended for use with the reference and uniqueReference types,
 * but can in theory be used by any widget or action that handles
 * external (i.e. non-embedded) documents. When combined with the
 * embedForm widget's support for dereferencing these field types,
 * this action provides a way to easily manage linked external
 * documents in Kanso.
 */

exports.saveExternalDocument = function (action_options, names, 
                                         data, options, callback) {
    var doc = data.value;
    delete doc._deleted;

    if (!doc || !doc._id) {
        throw new Error(
            'saveExternalDocument: The value provided is not a valid' +
                ' document, or does not contain a valid document identifier'
        );
    }

    var appdb = db.use(duality ? duality.getDBURL(): '/');
    appdb.saveDoc(
        doc, function (err, rv) {
            if (err) {
                throw new Error(
                    'saveExternalDocument: Failed to save document' +
                        ' with identifier `' + doc._id + '`'
                );
            }
            /* Indicate success */
            callback(true, doc);
        }
    );
};

