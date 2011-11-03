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
    utils = require('couchtypes/utils'),
    sanitize = require('sanitize'),
    _ = require('underscore')._;

var h = sanitize.escapeHtml;


/**
 * An action that produces a dialog box or popup, with buttons along
 * its bottom. The contents of the dialog can be controlled by
 * setting either options.widget or options.type. If both are
 * specified, the widget will be used. If only type is specified,
 * this function transparently instansiates an embedForm widget,
 * which does the actual form rendering and presentation. To control
 * which dialog implementation is used, set action_options.style.
 */

exports.showDialog = function (action_options,
                               names, data, options, callback) {
    options = (options || {});
    action_options = (action_options || {});

    var operation = 'update';
    var widget = action_options.widget;
    var name = sanitize.generateDomName(data.path);
    var path_extra = (options.path_extra || []).concat([ 'dialog' ]);

    if (names.action !== 'edit') {
        operation = names.action;
    }
    var widget_options = {
        path_extra: path_extra,
        operation: operation
    };

    /* Shortcut:
        If no widget is specified, assume embedForm, and
        use the options to showDialog as options to embedForm. */

    if (!widget && action_options.type) {
        var widgets = require('./widgets');
        widget = widgets.embedForm(
            _.defaults(action_options.options || {}, {
                type: action_options.type
            })
        );
    }

    if (!widget) {
        throw new Error(
            'showDialog: Unable to determine the widget to' +
            ' use for the field named `' + data.path.join('.') +
            '`; widget or field type was not correctly specified'
        );
    }

    /* Dialog setup and event handling:
        This is wrapped in a closure to allow it to easily be
        used inside both synchronous and asynchronous functions. */

    var generateAbstractDialog = function (_impl) {

        /* Generate strings for content */
        var cancel_label = 'Cancel';
        var title_label = action_options.title;
        var action_label = utils.titleize(names.action);

        if (!title_label) {
            var type_label = utils.titleize(names.type);
            title_label = [ action_label, type_label ].join(' ');
        }

        /* Generate inner elements */
        var title_elt = $(
            '<h2>' + h(title_label) + '</h2>'
        );
        var ok_elt = $(
            '<input type="submit" value="' + h(action_label) + '" />'
        );
        var cancel_elt = $(
            '<input type="button" value="' + h(cancel_label) + '" />'
        );
        var actions_elt = $(
            '<div class="actions" />'
        );

        /* Create widget's parent element */
        var div = $('<div class="dialog" />');

        /* Add dialog title */
        div.append(title_elt);

        /* Draw widget */
        div.append(
            widget.toHTML(
                name, data.value, data.raw, data.field,
                widget_options, data.errors
            )
        );

        /* Find the form element:
            This is created by the call to widget.toHTML, above. */

        var form_elt = div.closestChild('form');

        if (form_elt.length <= 0) {

            /* No form element found?
                Generate one and wrap the contents of the dialog with it.
                This provides support for widgets other than embedForm. */

            var wrapper_elt = $('<div class="dialog" />');

            /* Mark as a rendering context for CSS */
            div.addClass('render');
            div.removeClass('dialog');

            form_elt = $('<form />');
            form_elt.append(div);
            wrapper_elt.append(form_elt);
            div = wrapper_elt;
        }


        /* Insert elements:
            This is the panel of actions, including ok and cancel. */
        
        actions_elt.append(ok_elt);
        actions_elt.append(cancel_elt);
        form_elt.append(actions_elt);

        /* Insert elements:
            This is a progress indicator / spinner element. */
       
        var spinner_elt = $('<div class="spinner" />');
        spinner_elt.hide();

        form_elt.append(spinner_elt);
        form_elt.append('<div class="clear" />');

        /* Event handler:
            Handle successful outcome. */

        ok_elt.click(function (ev) {

            /* Show progress indicator:
                This is deleted automatically when the dialog is closed. */

            spinner_elt.show();

            /* Validate widget:
                This usually defers to a form type's implementation.
                Most simple widgets just return true for this method. */

            data.errors =
                widget.validate(div, data.path, widget_options);

            if (data.errors.length > 0) {

                /* Repost dialog box:
                    This will replace the current dialog box.
                    some dialog box implementations return to the event loop
                    before actually removing its elements, so we do the same. */

                _impl.close(div, options);

                exports.showDialog(
                    action_options, names, data, options, callback
                );

            } else {

                /* Invoke callback:
                    Let the widget that invoked us know that we're done. */

                callback(
                    true, widget.getValue(div, data.path, widget_options)
                );

                /* Order matters:
                    The callback may refer to elements inside of the
                    dialog, so don't destroy it until after it returns, and
                    has had a chance to register any callbacks / timeouts. */

                _impl.close(div, options);
            }

            ev.preventDefault();
        });

        /* Event handler:
            Handle negative outcome, or cancellation. */

        cancel_elt.click(function () {
            callback(
                false, widget.getValue(div, data.path, widget_options)
            );
            _impl.close(div, options);
        });

        /* Make default form action 'ok' */
        form_elt.submit(function (ev) {
            ev.preventDefault();
            ok_elt.click();
            return false;
        });

        /* Launch dialog:
            This wraps the <div> and inserts it in the DOM. */

        _impl.open(div, options);

        /* Initialize widget:
            We do this last -- this makes sure all elements are present
            and initialized prior to client-side widget initialization. */

        widget.clientInit(
            data.field, data.path, data.value,
                data.raw, data.errors, widget_options
        );
    };

    /* Pop-up style dialog:
        Javascript implementation provided by uPopup. */

    var popup;

    generateAbstractDialog({
        open: function (elt) {
            $(elt).uPopup('create', data.element, {
                center: true
            });
            var popup = $(elt).uPopup('wrapper');
        },
        close: function (elt) {
            $(elt).uPopup('destroy');
        }
    });

    return;
};


