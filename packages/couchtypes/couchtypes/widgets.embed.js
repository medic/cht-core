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
    session = require('session'),
    events = require('events'),
    forms = require('couchtypes/forms'),
    actions = require('couchtypes/actions'),
    render = require('couchtypes/render'),
    sanitize = require('sanitize'),
    utils = require('couchtypes/utils'),
    querystring = require('querystring'),
    _ = require('underscore')._,
    duality;


try {
    duality = require('duality/core');
}
catch (e) {
    // may not be available
}


var h = sanitize.escapeHtml;


/**
 * This module is an EventEmitter.
 */

var exports = module.exports = new events.EventEmitter();


/**
 * Creates a new field for storing/displaying an embedded object.
 * This is automatically added to embed and embedList field types
 * that don't specify a widget.
 *
 * @name embedded([options])
 * @param options
 * @returns {Widget Object}
 * @api public
 */

exports.embedList = function (_options) {
    var w = new core.Widget('embedList', _options);

    w.sortable = _options.sortable;
    w.singleton = _options.singleton;
    w.widget = (_options.widget || exports.defaultEmbedded());
    w.actions = actions.parse(_options.actions || {});

    w.toHTML = function (name, value, raw, field, options) {

        this.cacheInit();

        this.field = field;
        this.render_options = (options || {});
        value = this.normalizeValue(value || []);

        var id = this._id(
            name, 'list', this.render_options.offset,
                this.render_options.path_extra
        );
        var html = (
            '<div class="embed-list" rel="' +
                h(this.field.type.name) + '" id="' + h(id) + '">' +
                    '<div class="items" rel="' + h(name) + '">'
        );

        for (var i = 0, len = value.length; i < len; ++i) {
            html += this.htmlForListItem({
                offset: (this.singleton ? null : i),
                name: name,
                value: value[i],
                raw: raw
            });
        }
        html += (
                '</div>' +
                '<div class="embed-actions">' +
                    this.htmlForAddButton() +
                '</div>' +
            '</div>'
        );
        return html;
    };

    w.clientInit = function (field, path, value, raw, errors, options) {

        this.cacheInit();

        this.path = path;
        this.field = field;
        this.render_options = (options || {});
        value = this.normalizeValue(value || []);

        var item_elts = (
            this.discoverListItemsElement().children('.item')
        );

        for (var i = 0, len = item_elts.length; i < len; ++i) {
            this.bindEventsForListItem(item_elts[i]);

            if (_.isFunction(this.widget.clientInit)) {
                this.widget.clientInit(
                    this.field, this.path, value[i], value[i], [], {
                        offset: (this.singleton ? null : i)
                    }
                );
            }
        }

        this.renumberList();
        this.bindEventsForList();
    };

    /** private: **/

    w.cacheInit = function () {
        this.discoverListElement = _.memoize(this._discoverListElement);
        this.discoverListName = _.memoize(this._discoverListName);
        this.discoverListType = _.memoize(this._discoverListType);
        this.discoverListItemsElement =
            _.memoize(this._discoverListItemsElement);
    };

    w.normalizeValue = function (value) {
        value = this._parse_value(value);
        if (this.singleton) {
            if (value && !_.isArray(value)) {
                value = [ value ];
            }
        }
        return value;
    };

    w._discoverListElement = function () {
        return $('#' + this._id(
            this.path, 'list', this.render_options.offset,
                this.render_options.path_extra
        ));
    };

    w._discoverListName = function () {
        var list_elt = this.discoverListElement();
        var actions_elt = $(list_elt).closestChild('.embed-actions');
        return actions_elt.attr('rel');
    };
    
    w._discoverListType = function () {
        var list_elt = this.discoverListElement();
        return list_elt.attr('rel');
    };

    w._discoverListItemsElement = function () {
        var list_elt = this.discoverListElement();
        return list_elt.closestChild('.items');
    };

    w.discoverListItems = function () {
        return (
            this.discoverListItemsElement().children('.item')
        );
    };

    w.countListItems = function () {
        return this.discoverListItems().length;
    };

    w.bindEventsForList = function () {
        var list_elt = this.discoverListElement();
        var add_elt = $(list_elt).closestChild('.embed-actions .add');

        add_elt.bind('click', utils.bindContext(this, function (ev) {
            return this.handleAddButtonClick(ev);
        }));
    };

    w.bindEventsForListItem = function (item_elt) {
        item_elt = $(item_elt);
        var edit_elt = item_elt.closestChild('.embed-actions .edit');
        var delete_elt = item_elt.closestChild('.embed-actions .delete');

        edit_elt.bind('click', utils.bindContext(this, function (ev) {
            return this.handleEditButtonClick(ev);
        }));

        delete_elt.bind('click', utils.bindContext(this, function (ev) {
            return this.handleDeleteButtonClick(ev);
        }));

        if (this.sortable) {
            var up_elt = item_elt.closestChild('.embed-actions .up');
            var down_elt = item_elt.closestChild('.embed-actions .down');

            up_elt.bind('click', utils.bindContext(this, function (ev) {
                return this.handleUpButtonClick(ev);
            }));

            down_elt.bind('click', utils.bindContext(this, function (ev) {
                return this.handleDownButtonClick(ev);
            }));
        }
    };

    w.renumberList = function () {
        var item_elts =
            this.discoverListItemsElement().children('.item');

        for (var i = 0, len = item_elts.length; i < len; ++i) {
            var item = $(item_elts[i]);
            this.renumberListItem(item, i);
            this.updateListItemActions(item, i, len);

        }
        return this.updateListActions(len);
    };

    w.renumberListItem = function (elt, offset) {
        var widget_options = {
            offset: (this.singleton ? null : offset)
        };
        if (_.isFunction(this.widget.updateName)) {
            this.widget.updateName(elt, this.path, widget_options);
        }
    };

    w.updateListActions = function (offset) {
        var list_elt = this.discoverListElement();
        var add_elt = list_elt.closestChild('.embed-actions .add');

        if (this.singleton && offset > 0) {
            add_elt.hide();
        } else {
            add_elt.show();
        }
        return offset;
    };

    w.updateListItemActions = function (item_elt, offset, count) {
        if (this.sortable) {
            var attr = 'disabled';
            var up_elt = item_elt.closestChild('.embed-actions .up');
            var down_elt = item_elt.closestChild('.embed-actions .down');

            if (offset <= 0) {
                up_elt.attr(attr, attr);
            } else {
                up_elt.removeAttr(attr);
            }
            if (offset + 1 >= count) {
                down_elt.attr(attr, attr);
            } else {
                down_elt.removeAttr(attr);
            }
        }
    };

    w.moveExistingItem = function (after_elt, item_elt) {
        if (after_elt) {
            $(after_elt).after(item_elt);
        } else {
            var items_elt = this.discoverListItemsElement();
            items_elt.append(item_elt);
        }
        this.renumberList();
        this.bindEventsForListItem(item_elt);
    };

    w.deleteExistingItem = function (item_elt) {
        $(item_elt).remove();
        this.renumberList();
    };

    w.insertNewItemAtEnd = function (callback) {
        var list_elt = this.discoverListElement();

        var item_elts =
            this.discoverListItemsElement().children('.item');

        var last_elt = item_elts.last();

        return this.insertNewItem(
            (this.singleton ? null : item_elts.length),
                last_elt[0], callback
        );
    };

    w.insertNewItem = function (offset, after_elt, callback) {
        var list_elt = this.discoverListElement();
        var list_type = this.discoverListType();

        db.newUUID(100, utils.bindContext(this, function (err, uuid) {
            var value = { type: list_type, _id: uuid };

            var item_elt = $(this.htmlForListItem({
                name: this._name(this.path),
                offset: offset,
                value: value,
                raw: value
            }));

            this.moveExistingItem(after_elt, item_elt);

            if (_.isFunction(this.widget.clientInit)) {
                this.widget.clientInit(
                    this.field, this.path, value, null, [], {
                        offset: (this.singleton ? null : offset)
                    }
                );
            }

            if (callback) {
                callback(item_elt[0]);
            }
        }));
    };

    w.setListItemValue = function (item_elt, value, options) {
        if (this.widget.updateValue) {
            this.widget.updateValue(
                item_elt, this.path, value, options
            );
        }
    };

    w.htmlForListItem = function (item) {
        var html = (
            '<div class="item">' +
                this.widget.toHTML(
                    item.name, item.value, item.raw, this.field,
                        { offset: item.offset }
                ) +
                '<div class="embed-actions">' +
                    (this.sortable ? this.htmlForDownButton() : '') +
                    (this.sortable ? this.htmlForUpButton() : '') +
                    this.htmlForEditButton() +
                    this.htmlForDeleteButton() +
                '</div>' +
            '</div>'
        );
        return html;
    };

    w.htmlForAddButton = function () {
        return (
            '<input type="button" class="add action" value="Add" />'
        );
    };

    w.htmlForEditButton = function () {
        return (
            '<input type="button" class="edit action" value="Edit" />'
        );
    };

    w.htmlForDeleteButton = function () {
        return (
            '<input type="button" class="delete action" value="Delete" />'
        );
    };

    w.htmlForUpButton = function () {
        return (
            '<input type="button" class="up action" value="&uarr;" />'
        );
    };

    w.htmlForDownButton = function () {
        return (
            '<input type="button" class="down action" value="&darr;" />'
        );
    };

    w.dispatchEventToAction = function (target_elt, action_name,
                                        value_for_action, callback) {

        var name = this._name(this.path);
        var type_name = this.discoverListType();
        var item_elt = $(target_elt).closest('.item');
        var offset = item_elt.prevAll('.item').length;

        var widget_options = {
            offset: offset,
            path_extra: (this.render_options.path_extra || [])
        };

        if (value_for_action === undefined) {

            /* Action has no payload:
                Query the widget for its current value, and use that. */

            value_for_action = this.widget.getValue(
                item_elt, this.path, this.render_options
            );
        }

        if (!value_for_action) {
            return callback(
                this, target_elt, widget_options, false, undefined
            );
        }

        /* Grab closure for action */
        var action_handler = (
            this.actions[action_name] ||
                this.defaultActionFor(action_name)
        );

        /* Create a completion callback:
            The action handler will transfer control here when finished. */

        var cb = utils.bindContext(this,
            function (successful, new_value) {
                if (callback) {
                    callback.call(
                        this, target_elt,
                            widget_options, successful, new_value
                    );
                }
            }
        );

        /* Trigger action */
        if (action_handler) {
            action_handler(
                { action: action_name, type: type_name },

                { element: target_elt, raw: null,
                  field: this.field, path: this.path,
                  value: value_for_action, errors: [] },
                
                widget_options, cb
            );
        }
    };

    w.handleUpButtonClick = function (ev) {
        var item_elt = $(ev.target).closest('.item');
        item_elt.insertBefore(item_elt.prev('.item'));
        this.renumberList();
    };

    w.handleDownButtonClick = function (ev) {
        var item_elt = $(ev.target).closest('.item');
        item_elt.insertAfter(item_elt.next('.item'));
        this.renumberList();
    };

    w.handleAddButtonClick = function (ev) {
        var callback = utils.bindContext(
            this, this.handleAddCompletion
        );
        this.insertNewItemAtEnd(
            utils.bindContext(this, function (item_elt) {
                this.dispatchEventToAction(
                    $('.edit', item_elt), 'add', undefined, callback
                );
            })
        );
    };

    w.handleEditButtonClick = function (ev) {
        var callback = utils.bindContext(
            this, this.handleEditCompletion
        );

        this.dispatchEventToAction(
            ev.target, 'edit', undefined, callback
        );
    };

    w.handleDeleteButtonClick = function (ev) {
        var callback = utils.bindContext(
            this, this.handleDeleteCompletion
        );

        this.deleteExistingItem(
            $(ev.target).closest('.item', this)
        );

        this.dispatchEventToAction(
            ev, 'delete', undefined, callback
        );
    };

    w.handleAddCompletion = function (target_elt, offset,
                                      is_successful, new_value) {
        var item_elt =
            $(target_elt).closest('.item', this);

        if (is_successful) {
            var callback = utils.bindContext(
                this, this.handleSaveCompletion
            );
            this.dispatchEventToAction(
                item_elt, 'save', new_value, callback
            );
        } else {
            this.deleteExistingItem(item_elt);
        }
    };

    w.handleEditCompletion = function (target_elt, options,
                                       is_successful, new_value) {
        if (is_successful) {

            var callback = utils.bindContext(
                this, this.handleSaveCompletion
            );
            this.dispatchEventToAction(
                target_elt, 'save', new_value, callback
            );

        } else {

            /* Edit action was unsuccessful:
                This means the edit was canceled or otherwise aborted,
                and no changes should be made to the underlying data. */

            return this;
        }
    };

    w.handleDeleteCompletion = function (target_elt, options,
                                         is_successful, new_value) {
        exports.emit('delete', target_elt, options, is_successful, new_value);
        return;
    };

    w.handleSaveCompletion = function (target_elt, options,
                                       is_successful, new_value) {
        exports.emit('save', target_elt, options, is_successful, new_value);
        return;
    };

    w.defaultActionFor = function (name) {

        switch (name) {
        case 'add':
        case 'edit':
            return this.makeDefaultAction('showDialog', {
                widget: exports.embedForm({
                    type: this.field.type,
                    style: 'popup'
                })
            });
            /* break */
        case 'save':
            return this.makeDefaultAction('defaultEmbedSave', {});
            /* break */
        case 'delete':
            break;
        }
        return null;
    };

    w.makeDefaultAction = function (name, options) {
        return utils.bindContext(this, function () {
            actions[name].apply(
                this, [ options ].concat(
                    Array.prototype.slice.apply(arguments)
                )
            );
        });
    };

    return w;
};

/**
 * Creates a new field for storing/displaying an embedded object.
 * This is automatically added to embed and embedList field types
 * that don't specify a widget.
 *
 * @name defaultEmbedded([options])
 * @param options
 * @returns {Widget Object}
 * @api public
 */

exports.defaultEmbedded = function (_options) {
    var w = new core.Widget('defaultEmbedded', _options);

    w.toHTML = function (name, value, raw, field, options) {
        value = this._parse_value(value);
        var display_name = (value ? value._id: '');
        var fval = (value ? this._stringify_value(value) : '');

        if (field && field.type.display_name && value) {
            display_name = field.type.display_name(value);
        }
        var html = (
            '<div class="default-embed">' +
                '<input type="hidden" value="' + h(fval) + '" name="' +
                    h(this._name(name, options.offset)) + '" />' +
                '<span class="value" style="display: none">' + h(display_name) + '</span>' +
            '</div>'
        );
        return html;
    };
    return w;
};

/**
 * Creates a new instance of an embedded *form* for the specified type.
 * This is the basis for the presentation of complex data types,
 * and is used within an embedList to add and/or edit items.
 *
 * @name embedForm([options])
 * @param options
 * @returns {Widget Object}
 * @api public
 */

exports.embedForm = function (_options) {
    var w = new core.Widget('embedForm', _options);
    w.options = (_options || {});

    w.toHTML = function (name, value, raw, field, options, errors) {

        this.cacheInit();
        this.field = field;
        this.render_options = (options || {});

        value = this._parse_value(value);

        var id = this._id(
            name, 'form', this.render_options.offset,
                this.render_options.path_extra
        );

        this.is_reference = _.include(
            [ 'reference', 'unique_reference' ], this.field.type.name
        );

        if (this.is_reference && !this.options.noDereference) {

            /* Start progress indicator:
                We might be running server-side; show a progress indicator
                until we're able to make the XHR request in clientInit. */

            this.type = utils.getPropertyPath(field, [ 'type', 'type' ]);

            return (
                '<div id="' + id + '" class="embedded form">' +
                    '<div class="spinner" />' +
                '</div>'
            );
        } else {

            /* Not a reference type:
                Go ahead and render the full form synchronously. */

            this.type = this.options.type;

            return (
                '<div id="' + id + '" class="embedded form">' +
                    '<form>' +
                        this.renderEmbedded(value, errors) +
                    '</form>' +
                '</div>'
            );
        }
    };

    w.clientInit = function (field, path, value, raw, errors, options) {

        this.cacheInit();
        this.field = field;
        this.render_options = (options || {});

        if (this.is_reference) {

            /* Dereference document:
                Since we were provided with a reference type, we
                need to use the reference's ref or id attribute to
                look up the actual value to be used while rendering
                the form. This has to be asynchronous, so we do it here. */

            var document_id = (value.ref || value._id);

            var appdb = db.use(duality ? duality.getDBURL(): '/');
            appdb.getDoc(
                document_id,
                utils.bindContext(this, function (err, rv) {
                    if (err) {
                        throw new Error(
                            'Unable to locate the identifier `' +
                                document_id + '`, referenced from the' +
                                ' reference document `' + value._id + '`'
                        );
                    }

                    /* Render form:
                        The enclosing div already exists; include the form
                        element, since we're replacing the whole contents. */

                    var container_elt = this.discoverContainerElement(path);

                    $(container_elt).html(
                        this.renderEmbedded(rv, errors)
                    );
                })
            );
        }
    };

    w.getValue = function (elt, path, options) {

        this.validate(elt, path, options);
        return this.parsed_value;
    };

    w.validate = function (elt, path, options) {

        var f = this.form;
        var container_elt = this.discoverContainerElement(path);
        var form_elt = container_elt.closestChild('form');

        f.validate({
            form: this.serialize(form_elt),
            userCtx: session.userCtx
        });

        if (f.errors.length <= 0) {
            this.parsed_value = this.form.values;
        } else {
            this.parsed_value = undefined;
        }

        return f.errors;
    };

    /** private: **/

    w.cacheInit = function () {
        this.discoverContainerElement = this._discoverContainerElement;
    };

    w.serialize = function (form_elt) {
        return querystring.parse(
            form_elt.serialize().replace(/\+/g, '%20')
        );
    };

    w._discoverContainerElement = function (path) {
        var id = this._id(
            path, 'form', this.render_options.offset,
                this.render_options.path_extra
        );
        return $('#' + id);
    };

    w.renderEmbedded = function (value, errors) {

        this.form = new forms.Form(this.type);
        this.form.values = value;
        
        if(errors) {
            this.form.errors = errors;
        }

        var html = (
            '<form>' +
            this.form.toHTML(
                null, render.defaultRenderer(),
                    this.render_options, true /* create defaults */
            ) +
            '</form>'
        );

        return html;
    };

    return w;
};
