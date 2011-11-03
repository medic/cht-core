/*global $: false, kanso: true*/

/**
 * Widgets define the way a Field object is displayed when rendered as part of a
 * Form. Changing a Field's widget will be reflected in the admin app.
 *
 * @module
 */

/**
 * Module dependencies
 */

var core = require('./widgets.core'),
    db = require('db'),
    settings = require('settings/root'),
    sanitize = require('sanitize'),
    utils = require('couchtypes/utils'),
    _ = require('underscore')._,
    duality;


try {
    duality = require('duality/core');
}
catch (e) {
    // may not be available
}


var h = sanitize.escapeHtml,
    css = sanitize.escapeAttributeSelectorValue;


/**
 * Creates a new document selector widget. This widget allows the
 * user to select a document from a CouchDB view (specified in options).
 * The options available for this widget are explained briefly below:
 *
 * <table class="options">
 *   <tr>
 *      <td class="name">viewName</td>
 *      <td class="type">String</td>
 *      <td class="description">
 *          The name of the CouchDB view that you'd like to select
 *          documents from. If this option is not specified, it will
 *          look for a view with the same name as this widget's field.
 *      </td>
 *   </tr>
 *   <tr>
 *      <td class="name">db</td>
 *      <td class="type">String</td>
 *      <td class="description">
 *          The CouchDB database containing the view for this widget. If
 *          this option is not specified, the current database will be used.
 *      </td>
 *   </tr>
 *   <tr>
 *      <td class="name">useJSON</td>
 *      <td class="type">String</td>
 *      <td class="description">
 *          Set this option to false if this widget should yield a string
 *          containing a single document id. Set this option to true (the
 *          default) to yield a JSON string.
 *      </td>
 *   </tr>
 *   <tr>
 *      <td class="name">storeEntireDocument</td>
 *      <td class="type">String</td>
 *      <td class="description">
 *          Set this option to false if this widget should yield *only*
 *          a document identifier, effectively storing a reference to a
 *          document. Set this option to true (the default) to include
 *          all fields from the selected document. If useJSON is false,
 *          then this option is ignored and treated as if it were false.
 *      </td>
 *   </tr>
 *   <tr>
 *      <td class="name">optionDesc</td>
 *      <td class="type">Function</td>
 *      <td class="description">
 *          Pass in another function to help with rendering of the &lt;option&gt;
 *          html element.  The only param to this function is the row that is
 *          fetched from the view. This is the text displayed in the select box. 
 *      </td>
 *   </tr>
 * </table>
 *
 * @constructor
 * @param options
 */

exports.documentSelector = function (_options) {
    var w = new core.Widget('documentSelector', _options);

    w.options = _.defaults(_options || {}, {
        useJSON: true,
        storeEntireDocument: true
    });

    w.toHTML = function (name, value, raw, field, options) {
        this.cacheInit();

        var html_name = this._name(
            name, options.offset
        );
        var container_id = this._id(
            name, 'widget', options.offset, options.path_extra
        );
        var select_id = this._id(
            name, options.offset, options.path_extra
        );
        var select_html = (
            '<select class="document-selector" id="' + select_id +
                '" name="' + html_name + '" />'
        );
        var html = (
            '<div id="' + container_id + '"' +
                ' class="document-selector widget">' +
                select_html +
                '<div class="spinner" style="display: none;" />' +
            '</div>'
        );

        return html;
    };

    w.updateName = function (elt, path, options) {
        this.cacheInit();
        var select_elt = this.discoverSelectionElement(elt);

        select_elt.attr('id', this._id(
            path, options.offset, options.path_extra
        ));
        select_elt.attr('name', this._name(
            path, options.offset
        ));
    };

    w.updateValue = function (elt, path, value, options) {
        var new_value = value;
        var select_elt = this.discoverSelectionElement(elt);

        if (this.options.useJSON) {
            new_value = this._stringify_value(new_value);
        }

        /* Update <select> element contents, if necessary:
            If we're storing a JSON-encoded object, then we need to
            modify the <option> affected by the value change. This
            ensures that the selected item remains selected, despite
            changes to other fields (and possible property reordering). */

        if (this.options.useJSON) {
            if (value && value._id) {
                var selector = (
                    'option[rel="' + css(
                        (this.useReferenceKey() ? value.ref : value._id)
                    ) + '"]'
                );
                var option_elt = $(selector, select_elt);
                option_elt.val(new_value);
            }
        }

        select_elt.val(new_value);
    };

    w.getValue = function (elt, path, options) {
        var select_elt = this.discoverSelectionElement(elt);
        return this._parse_value(select_elt.val());
    };

    w.clientInit = function (field, path, value, raw, errors, options) {
        var id = this._id(
            path, 'widget', options.offset, options.path_extra
        );
        var container_elt = $('#' + id);
        var widget_options = (this.options || {});
        var spinner_elt = container_elt.closestChild('.spinner');
        var select_elt = this.discoverSelectionElement(container_elt);

        /* Start progress */
        spinner_elt.show();

        /* Load options from view */
        this.populateSelectElement(
            container_elt, field, path, value, widget_options, function () {
                spinner_elt.hide();
            }
        );
    };

    /** private: **/

    w.populateSelectElement = function (container_elt, field,
                                        path, val, options, callback) {
        var select_elt =
            this.discoverSelectionElement(container_elt);

        var appdb = db.use(options.db || duality ? duality.getDBURL(): '/');
        appdb.getView(
            options.appname || settings.name,
            options.viewName,
            { include_docs: options.storeEntireDocument },
            { useCache: true, db: options.db, appName: options.appName },

            utils.bindContext(this, function (err, rv) {
                /* Error handling for getView */
                if (err) {
                    throw new Error(
                        'Failed to request content from view `' +
                            options.viewName + '`'
                    );
                }

                /* Option element for 'no selection' */
                var nil_option = $('<option />');
                if (!val) {
                    nil_option.attr('selected', 'selected');
                }
                select_elt.append(nil_option);

                /* All other option elements */
                _.each(rv.rows || [], utils.bindContext(this, function (r) {
                    var option_elt = $('<option />');

                    if (this.isOptionSelected(r, val, options)) {
                        option_elt.attr('selected', 'selected');
                    }
                    this.generateOptionValue(
                        field, r, val, options,
                        utils.bindContext(this, function (err, v) {
                            if (err) {
                                throw new Error(
                                    'Failed to generate uuid for' +
                                        ' field `' + this._name(path) + '`'
                                );
                            }
                            /* Insert new <option> */
                            option_elt.val(v);
                            if (options.optionDesc) {
                                option_elt.text(options.optionDesc(r));
                            } else {
                                option_elt.text(r.value);
                            }
                            option_elt.attr('rel', r.id);
                            select_elt.append(option_elt);
                        })
                    );
                }));

                /* Finished:
                    Flow will transfer back to clientInit. */

                callback();
            })
        );
    };

    w.useReferenceKey = function () {
        return (
            this.options.useJSON && !this.options.unique &&
                !this.options.storeEntireDocument
        );
    };

    w.isOptionSelected = function (row, value, options) {
        if (options.useJSON) {
            if (this.useReferenceKey()) {
                return ((value || {}).ref === row.id);
            } else {
                return ((value || {})._id === row.id);
            }
        } else {
            return (value === row.id);
        }
    };

    w.generateOptionValue = function (field, row, value, options, callback) {
        if (options.useJSON) {
            if (options.storeEntireDocument) {

                /* Embed actual document:
                    Duplicates are automatically disallowed. */

                callback(false, JSON.stringify(row.doc));

            } else if (options.unique) {

                /* Reference, duplicates disallowed:
                    Store id inside of _id attribute. */

                callback(false, JSON.stringify({
                    _id: row.id,
                    type: field.type.name
                }));

            } else {

                /* Reference, duplicates allowed:
                    Store id inside of the ref attribute, and generate
                    a new UUID for the _id attribute if it's necessary. */

                var return_value = function (uuid) {
                    callback(false, JSON.stringify({
                        _id: uuid,
                        ref: row.id,
                        type: field.type.name
                    }));
                };

                var forward_error = function (err) {
                    callback(err, null);
                };

                if (value && value._id) {
                    return_value(value._id);
                } else {
                    db.newUUID(100, function (err, uuid) {
                        if (err) {
                            forward_error(err);
                        } else {
                            return_value(uuid);
                        }
                    });
                }
            }
        } else {

            /* Not using JSON:
                The type is a scalar; just use the _id. */

            callback(false, row.id);
        }

        return this;
    };

    w.cacheInit = function () {
        this.discoverSelectionElement = this._discoverSelectionElement;
    };

    w._discoverSelectionElement = function (container_elt) {
        return $(container_elt).closestChild('select.document-selector');
    };

    return w;
};

