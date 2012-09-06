(function ($) {
    /**
     * Creates a thead element for the given unique key list.
     */

    var createHeadings = function (columns) {
        var thead = $('<thead/>');
        var thead_tr = $('<tr/>');
        thead.append(thead_tr);

        thead_tr.append('<th class="handle"></td>');

        _.each(columns, function (c) {
            var th = $('<th/>').text(c.label);
            thead_tr.append(th);
        });

        return thead;
    };


    // path is a property name or array of property names
    var getProperty = function (obj, path) {
        // if path is empty, return the root object
        if (!path) {
            return obj;
        }
        if (!_.isArray(path)) {
            path = [path];
        }

        // loop through all parts of the path, returning undefined if a
        // property doesn't exist
        for (var i = 0; i < path.length; i++) {
            var x = path[i];
            if (obj[x] === undefined) {
                return undefined;
            }
            obj = obj[x];
        }
        return obj;
    };

    var setProperty = function (obj, path, val) {
        // if path is empty, return the root object
        if (!_.isArray(path)) {
            path = [path];
        }
        var curr = [];

        // loop through all parts of the path except the last, creating the
        // properties if they don't exist
        var prop = path.slice(0, path.length - 1).reduce(function (a, x) {
            curr.push(x);
            if (a[x] === undefined) {
                a[x] = {};
            }
            if (typeof a[x] === 'object' && !Array.isArray(a[x])) {
                a = a[x];
            }
            else {
                /*
                throw new Error(
                    'Updating "' + p + '" would overwrite "' +
                        curr.join('.') + '"\n' +
                    '\n' +
                );
                */
                // overwrite existing structure
                a = a[x] = {}
            }
            return a;
        }, obj);

        // set the final property to the given value
        prop[path[path.length - 1]] = val;

        return val;
    };



    /**
     * Creates a tbody element for the given keys and data
     */

    var createBody = function (columns, data) {
        var tbody = $('<tbody/>');
        _.each(data, function (doc) {
            var tr = createRow(columns, doc);
            tbody.append(tr);
        });
        return tbody;
    };

    var createValidation = function (column) {
        var validation = column.validation;

        if (_.isFunction(validation)) {
            return validation;
        } else if (_.isString(validation)) {
            if (validation === 'phone') {
                column.validationHint = 'Phone number: +225588881111';
                return function(v) {
                    return /^\s*\+\d{11,12}\s*$/.test(v);
                }
            } else if (validation === 'notblank') {
                column.validationHint = 'Value required';
                return function(v) {
                    return /\w/.test(v);
                }
            } else if (validation === 'integer') {
                column.validationHint = 'Numbers only';
                return function(v) {
                    return /^\s*\d+\s*$/.test(v);
                }
            } else {
                return undefined;
            }
        }
    };

    var createRow = function (columns, doc) {
        var tr = $('<tr/>');
        tr.data('_id', doc._id);
        tr.append('<th class="handle"><div class="control"><a class="btn btn-mini btn-danger delete-row" href="#"><i class="icon-trash"></i></a></div></th>');
        _.each(columns, function (c) {
            var p = getProperty(doc, c.property),
                td,
                validation = createValidation(c);


            // validation only available for "normal" cells
            if (typeof c.createCellHandler === 'function') {
                td = c.createCellHandler(c, p);
            } else {
                td = $('<td/>');
                td.data({
                    'validation': validation,
                    'validation-hint': c.validationHint
                });
                setValue(td, p, { silent: true });
            }
            td.data({
                'editSelectionHandler': _.isFunction(c.editSelectionHandler) ? c.editSelectionHandler : undefined,
                'property': c.property
            });

            tr.append(td);
        });
        return tr;
    };


    /**
     * Removes the input element used for inline-editing of cell values
     */

    var clearInlineEditor = function () {
        var $input,
            $table = $(this);
        if ($table.data('spreadsheet:edit-inline-input')) {
            $input = $($table.data('spreadsheet:edit-inline-input'));
            if ($.fn.tooltip) {
              $input.tooltip('hide');
            }
            $input.remove();
            $table.data('spreadsheet:edit-inline-input', undefined);
            $table.data('spreadsheet:edit-inline-td', undefined);
        }
    };


    /**
     * Updates the cell value with the value from the inline editor and
     * clears the inline editor input element
     */

    var completeInlineEditor = function () {
        var $table = $(this),
            input = $table.data('spreadsheet:edit-inline-input'),
            td = $table.data('spreadsheet:edit-inline-td');
        if (td && input) {
            setValue(td, $(input).val());
        }
        clearInlineEditor.call(this);
    };

    var editCell = function (td, clear_value) {
        if (!td) {
            return;
        }
        clearInlineEditor.call(this);
        if (typeof $(td).data('editSelectionHandler') === 'function') {
            $(td).data('editSelectionHandler')(td, setValue);
        } else {
            editInline.call(this, td, clear_value);
        }
    };

    /**
     * Clears exisitng inline-edit elements and creates a new one for the
     * provided td element
     */
    var editInline = function (td, clear_value) {
        var $input,
            $table = $(this),
            $td = $(td),
            offset = $td.offset(),
            validation = $td.data('validation'),
            validationHint = $td.data('validation-hint');

        // if no validation fn provided, it's always valid
        validation = validation || function() { return true; }

        $input = $('<input class="edit-inline" type="text" />').css({
            height: ($td.outerHeight() - 3) + 'px',
            minWidth: ($td.outerWidth() - 1) + 'px',
            position: 'absolute',
            top: offset.top,
            left: offset.left
        });
        $input.on('focus keyup mouseup blur', function() {
            var valid = validation.call($input, $input.val());
            $input.toggleClass('invalid-value', !valid);
        });
        if (clear_value) {
            $input.val('');
        }
        else {
            $input.val($(td).text());
        }

        if (validationHint) {
            $input.attr('title', validationHint);
            if ($.fn.tooltip) {
                $input.tooltip({'trigger':'focus'});
            }
        }
        $td.parents('table').after($input);
        $table.data('spreadsheet:edit-inline-input', $input[0]);
        $table.data('spreadsheet:edit-inline-td', $td[0]);
        return $input.focus();
    };



    /**
     * Change the selected cell to the provided td element
     */

    var select = function (td) {
        var div = $('#spreadsheet_select'),
            reselect = false,
            $td = $(td),
            $table = $(this);
        if (!div.length) {
            // previously unselected - this was causing some strange
            // problems with highlight positioning until the next
            // selection change, so force another selection change now
            reselect = true;
            div = $('<div id="spreadsheet_select" />');
            $td.parents('table').after(div);
        }
        var offset = $td.offset();
        div.css({
            width: $td.outerWidth() - 3,
            height: $td.outerHeight() - 3,
            top: offset.top,
            left: offset.left,
            position: 'absolute'
        });

        if (td === $table.data('spreadsheet:selected-td')) {
            // already selected
            return;
        }
        $table.data('spreadsheet:selected-td', $td[0]);
        $table.data('spreadsheet:select-div', div);

        $table.data('spreadsheet:current-table', $table);

        if (reselect) {
            select.call(this, td);
        }

        $table.trigger('selectionChange');
    };


    /**
     * Clears the currently selected cell
     */

    var clearSelection = function () {
        var $table = $(this);
        if ($table.data('spreadsheet:select-div')) {
            $($table.data('spreadsheet:select-div')).remove();
            $table.data('spreadsheet:select-div', undefined);
            $table.data('spreadsheet:selected-td', undefined);
        }
        $table.trigger('selectionChange');
    };


    /**
     * Set the value of a cell. Changes the text inside the td element
     * and fires a change event
     */

    var setValue = function (td, val, options) {
        var $td = $(td),
            options = options || {},
            validation = $td.data('validation');

        _.defaults(options, {
            silent: false // whether to trigger an event
        });

        if (_.isFunction(validation)) {
            $td.toggleClass('error', !validation(val));
        }
        $td.text(val);
        if (!options.silent) {
            $td.trigger('change');
        }
        return td;
    };


    /**
     * Get the row and column for the provided td element
     */

    var getCellPosition = function (table, td) {
        var trs = $('tbody>tr', table);
        for (var r = 0; r < trs.length; r++) {
            var tds = $('td', trs[r]);
            for (var c = 0; c < tds.length; c++) {
                if (tds[c] === td) {
                    return {row: r, column: c};
                }
            }
        }
        return null;
    };


    /**
     * Get the td element at the given row and column in the table
     */

    var getCellAt = function (table, row, column) {
        if (row < 0 || column < 0) {
            // no negative values for row or column
            return;
        }
        var trs = $('tbody>tr', table);
        if (row >= trs.length) {
            return;
        }
        var tds = $('td', trs[row]);
        if (column >= tds.length) {
            return;
        }
        return tds[column];
    };


    /*
    var parseRow = function (tr, options) {
        var tds = $('td', tr);
        return _.reduce(options.keys, function (obj, k, i) {
            // TODO: coerce values according options
            obj[k] = $(tds[i]).text();
            return obj;
        }, {});
    };
    */

    var getDoc = function (tr, options) {
        var id = $(tr).data('_id');

        for (var i = 0; i < options.data.length; i++) {
            if (id === options.data[i]._id) {
                return options.data[i];
            }
        }
        throw new Error('No document found with _id: ' + JSON.stringify(id));
    };


    var removeDoc = function(doc, options) {
        var index = _.indexOf(options.data, doc);
        if (index >= 0) {
            options.data.splice(index, 1);
        } else {
            throw new Error(
                'No document found with _id: ' + JSON.stringify(doc._id)
            );
        }
    };

    var updateDoc = function (doc, options) {
        for (var i = 0; i < options.data.length; i++) {
            if (doc._id === options.data[i]._id) {
                options.data[i] = doc;
                return;
            }
        }
        throw new Error(
            'No document found with _id: ' + JSON.stringify(doc._id)
        );
    };


    var saveDoc = function (tr, options) {
        var $tr = $(tr);
        function _saveDoc() {
            var callback,
                doc,
                update = $tr.parent().length > 0; // no parent => detached from document
            if (!$tr.data('save_queued')) {
                return;
            }
            if ($tr.hasClass('saving')) {
                // _saveDoc will be called again once the current
                // save operation has completed
                return;
            }
            $tr.data('save_queued', false);
            $tr.addClass('saving');
            $tr.removeClass('error');

            doc = getDoc(tr, options);
            callback = function (err, doc) {
                $tr.removeClass('saving');
                if (err) {
                    $tr.addClass('error');
                    // TODO: do something better than alert
                    return alert(err.toString());
                }
                if (!doc || !doc._id) {
                    throw new Error(
                        'new doc must be returned to save callback'
                    );
                }
                if (update) {
                    updateDoc(doc, options);
                } else {
                    removeDoc(doc, options);
                }
                _saveDoc();
            };

            if (update) {
              options.save(doc, callback);
            } else {
              options.remove(doc, callback);
            }
        }
        if ($tr.data('save_queued')) {
            return;
        } else {
            // collect all save calls for this tick into a single save operation
            $tr.data('save_queued', true);
            setTimeout(_saveDoc, 0);
        }
    };

    var addRow = function (table, options) {
        var _add = function (err, doc) {
            if (err) {
                return console.error(err);
            }
            if (!doc) {
                throw new Error(
                    'Create function did not return a document object'
                );
            }
            options.data.push(doc);
            var tr = createRow(options.columns, doc);
            $('tbody', table).append(tr);
            $(table).trigger('change');
        };
        options.create(_add);
    };

    // adds .active class to thead th for columns and first th element of rows
    // that are in range or selected
    var updateActiveMarkers = function () {
        var ec,
            sc,
            trs,
            pos,
            selected,
            sr,
            er,
            c,
            r,
            $table = $(this),
            ths = $('thead th', $table);
        ths.removeClass('active');
        $('th.handle').removeClass('active');

        if ($table.data('spreadsheet:range-tds')) {
            sc = $table.data('spreadsheet:range-start-col');
            ec = $table.data('spreadsheet:range-end-col');
            for (c = sc; c <= ec; c++) {
                $(ths[c + 1]).addClass('active');
            }
            trs = $('tbody tr', $table);
            sr = $table.data('spreadsheet:range-start-row;')
            er = $table.data('spreadsheet:range-end-row;')
            for (r = sr; r <= er; r++) {
                $('th.handle', trs[r]).addClass('active');
            }
        }
        else {
            selected = $table.data('spreadsheet:selected-td');
            if (selected) {
                pos = getCellPosition($table, selected);
                $(ths[pos.column + 1]).addClass('active');
            }
            if (selected) {
                $('th.handle', $(selected).parents('tr')).addClass('active');
            }
        }
    };


    var setRangeElements = function (start_td, end_td) {
        var $table = $(this),
          start = getCellPosition($table, start_td),
          end = getCellPosition($table, end_td);
        return setRange.call($table, start.column, start.row, end.column, end.row);
    };

    var setRange = function (start_col, start_row, end_col, end_row) {
        var c,
            cell,
            r,
            sc = Math.min(start_col, end_col),
            ec = Math.max(start_col, end_col),
            sr = Math.min(start_row, end_row),
            er = Math.max(start_row, end_row),
            $table = $(this);

        $('td.range', $table).removeClass('range');

        $table.data('spreadsheet:range-tds', []);
        $table.data('spreadsheet:range-start-col', sc);
        $table.data('spreadsheet:range-end-col', ec);
        $table.data('spreadsheet:range-start-row', sr);
        $table.data('spreadsheet:range-end-row', er);

        for (c = sc; c <= ec; c++) {
            for (r = sr; r <= er; r++) {
                cell = getCellAt($table, r, c);
                $(cell).addClass('range');
                $table.data('spreadsheet:range-tds').push(cell);
            }
        }
        $table.trigger('rangeChange');
    };


    var clearRange = function () {
        var $table = $(this);
        $('td.range', $table).removeClass('range');
        $table.data('spreadsheet:range-tds', undefined);
        $table.data('spreadsheet:range-start-col', undefined);
        $table.data('spreadsheet:range-end-col', undefined);
        $table.data('spreadsheet:range-start-row', undefined);
        $table.data('spreadsheet:range-end-row', undefined);
        $table.trigger('rangeChange');
    };


    var showRowContextMenu = function () {
        alert('row context menu');
    };


    /**
     * Handles user interaction with the table
     */

    var bindTableEvents = function (options) {
        var $table = $(this);
        $table.bind('rangeChange', function () {
            updateActiveMarkers.call($table);
        });
        $table.bind('selectionChange', function () {
            clearRange.call($table);
            updateActiveMarkers.call($table);

            if (!$table.data('spreadsheet:selected-td')) {
                completeInlineEditor.call($table);
            }
            if ($table.data('spreadsheet:edit-inline-td')) {
                if ($table.data('spreadsheet:edit-inline-td') != $table.data('spreadsheet:selected-td')) {
                    completeInlineEditor.call($table);
                }
            }
            // scroll page to make new selection visible
            var s = $($table.data('spreadsheet:selected-td'));
            if (s.length) {
                var offset = s.offset();
                var scroll_y = $(window).scrollTop();
                var max_y = scroll_y + $(window).height() - s.outerHeight();
                if (offset.top > max_y) {
                    $(window).scrollTop(scroll_y + (offset.top - max_y) + 1);
                }
                // TODO: 41 is the height of the navbar on KE, make this
                // configurable
                else if (offset.top - 41 < scroll_y) {
                    $(window).scrollTop(offset.top - 41);
                }
                var scroll_x = $(window).scrollLeft();
                var max_x = scroll_x + $(window).width() - s.outerWidth();
                if (offset.left > max_x) {
                    $(window).scrollLeft(scroll_x + (offset.left - max_x) + 1);
                }
                else if (offset.left < scroll_x) {
                    $(window).scrollLeft(offset.left);
                }
            }
        });
        $table.bind('change', function (ev) {
            // re-select td to make sure select box is properly resized.
            if ($table.data('spreadsheet:selected-td')) {
                select.call($table, $table.data('spreadsheet:selected-td'));
            }
            // update row counter
            $('.row-counter', $table).text(options.data.length + ' rows');
        });
        $table.on('mousedown', 'thead th', function (ev) {
            var ths = $('thead th', $table);
            var trs = $('tbody tr', $table);

            for (var i = 1; i < ths.length; i++) {
                if (this === ths[i]) {
                    // select whole column
                    setRange.call($table, i - 1, 0, i - 1, trs.length);
                }
            }
        });
        $table.on('mousedown', 'tbody th.handle', function (ev) {
            var this_tr = $(this).parent()[0];
            var tds = $('td', this_tr);
            var trs = $('tbody tr', $table);

            for (var i = 0; i < trs.length; i++) {
                if (this_tr === trs[i]) {
                    // select whole row
                    setRange.call($table, 0, i, tds.length - 1, i);
                }
            }
        });
        $table.on('mousedown', 'td', function (ev) {
            $('td.active', $table).removeClass('active');
            var pos = getCellPosition($table, this);
            $table.data('spreadsheet:start-column', pos.column);
            if (ev.shiftKey) {
                setRangeElements.call($table, $table.data('spreadsheet:selected-td'), this);
            } else {
                select.call($table, this);
            }
        });
        $table.on('mouseover', 'tbody td', function (ev) {
            ev.preventDefault();
            if ($table.data('spreadsheet:left-btn-down') && $table.data('spreadsheet:selected-td')) {
                // left mouse button pressed and move started on table
                setRangeElements.call($table, $table.data('spreadsheet:selected-td'), this);
            }
            return false;
        });
        $table.on('change', 'tr', function (ev) {
            // TODO: don't save on every cell change, use a timeout and
            // wait until a different tr is selected if possible
            // TODO: check if doc has actually changed values
            var tr = $(this);
            saveDoc(tr, options);
        });
        $table.on('change', 'td', function (ev) {
            // update doc value in spreadsheet data array
            var tr = $(this).parent(),
                doc = getDoc(tr, options);
            // TODO: coerce value to correct type depending on options
            setProperty(doc, $(this).data('property'), $(this).text());
        });
        $table.on('click', 'tbody th', function (ev) {
            if (ev.which === 3) { // right mouse button

                // disable actual context-menu
                ev.preventDefault();
                ev.stopImmediatePropagation();
            }
        });
        $table.on('click', 'tbody .delete-row', function (ev) {
            ev.preventDefault();
            var deleted,
                row = $(this).parents('tr'),
                index = row.index();
            row.trigger('change');
            row.detach();
            // update row counter
            $('.row-counter', $table).text(options.data.length - 1 + ' rows');
        });
        $table.on('click', '.spreadsheet-actions .add-row-btn', function (ev) {
            ev.preventDefault();
            addRow($table, options);
            return false;
        });
    };


    var bindDocumentEvents = function () {
        var $table = $(this);
        if ($table.data('spreadsheet:bound')) {
            // only bind these event handlers once
            return;
        }
        // keep track of left btn, since ev.which is unreliable inside
        // mouseover events (FF seems to think it's always pressed)
        $table.data('spreadsheet:left-btn-down', false);
        $(document).mousedown(function (ev) {
            if (ev.which === 1) {
                $table.data('spreadsheet:left-btn-down', true);
            }
        });
        $(document).mouseup(function (ev) {
            if (ev.which === 1) {
                $table.data('spreadsheet:left-btn-down', false);
            }
        });
        $(document).bind('cut', function (ev) {
            var td = $table.data('spreadsheet:selected-td'),
                textarea,
                val;
            if (td) {
                val = $(td).text();
                textarea = $table.data('spreadsheet:clipboard-textarea');
                textarea.val(val).focus().select();
                setTimeout(function () {
                    textarea.val('');
                    setValue(td, '');
                }, 0);
            }
        });
        $(document).bind('copy', function (ev) {
            var td,
                textarea,
                val;
            // TODO: copy cell ranges
            if (ev.target.tagName !== 'INPUT') {
                td = $table.data('spreadsheet:selected-td');
                if (td) {
                    val = $(td).text();
                    textarea = $table.data('spreadsheet:clipboard-textarea');
                    textarea.val(val).focus().select();
                    setTimeout(function () {
                        textarea.val('');
                    }, 0);
                }
            }
        });
        $(document).bind('paste', function (ev) {
            // TODO: paste cell ranges
            if (ev.target.tagName !== 'INPUT') {
                $table.data('spreadsheet:clipboard-textarea').val('').focus();
                setTimeout(function () {
                    var val = $($table.data('spreadsheet:clipboard-textarea')).val(),
                        td = $table.data('spreadsheet:selected-td');
                    if (td) {
                        setValue(td, val);
                    }
                }, 0);
            }
        });
        $(document).on('dblclick', '#spreadsheet_select', function (ev) {
            var td = $table.data('spreadsheet:selected-td');
            editCell.call($table, td);
        });
        $(document).click(function (ev) {
            var el = $(ev.target),
              input = $table.data('spreadsheet:edit-inline-input'),
              select_div = $table.data('spreadsheet:select-div'),
              table = $table.data('spreadsheet:current-table');
            if (!el.is('td', table) && !el.is(input) && !el.is(select_div)) {
                clearSelection.call(this);
            }
        });
        $(document).keydown(function (ev) {
            var selected = $table.data('spreadsheet:selected-td'),
                input = $table.data('spreadsheet:edit-inline-input'),
                cell,
                col,
                pos,
                offset,
                key = ev.which;

            if (key === 27)  { /* ESC */
                clearInlineEditor.call($table);
            }
            else if (key === 16)  { /* SHIFT */            return; }
            else if (key === 17)  { /* CTRL */             return; }
            else if (key === 18)  { /* ALT */              return; }
            /* MAC COMMAND KEYS FOR CHROME/FF http://stackoverflow.com/q/3834175/22419 */
            else if (key === 91 ||
                     key === 93 ||
                     key === 224)  {                       return; }
            else if (key === 38)  { /* UP */
                if (!selected || ev.target.tagName === 'INPUT') {
                    return;
                }
                pos = getCellPosition($table, selected);
                cell = getCellAt($table, pos.row - 1, pos.column)
                if (cell) {
                    ev.preventDefault();
                    $table.data('spreadsheet:start-column', pos.column);
                    select.call($table, cell);
                }
            }
            else if (key === 40)  { /* DOWN */
                if (!selected || ev.target.tagName === 'INPUT') {
                    return;
                }
                pos = getCellPosition($table, selected);
                cell = getCellAt($table, pos.row + 1, pos.column)
                if (cell) {
                    ev.preventDefault();
                    $table.data('spreadsheet:start-column', pos.column);
                    select.call($table, cell);
                }
            }
            else if (key === 37)  { /* LEFT */
                if (!selected || ev.target.tagName === 'INPUT') {
                    return;
                }
                pos = getCellPosition($table, selected);
                cell = getCellAt($table, pos.row, pos.column - 1)
                if (cell) {
                    ev.preventDefault();
                    $table.data('spreadsheet:start-column', pos.column - 1);
                    select.call($table, cell);
                }
            }
            else if (key === 39)  { /* RIGHT */
                if (!selected || ev.target.tagName === 'INPUT') {
                    return;
                }
                pos = getCellPosition.call($table, selected);
                cell = getCellAt($table, pos.row, pos.column + 1)
                if (cell) {
                    ev.preventDefault();
                    $table.data('spreadsheet:start-column', pos.column + 1);
                    select.call($table, cell);
                }
            }
            else if (key === 46)  { /* DEL */
                if (ev.target.tagName === 'INPUT') {
                    return;
                }
                if ($table.data('spreadsheet:range-tds')) {
                    _.each($table.data('spreadsheet:range-tds'), function (td) {
                        // clear value of selected td
                        setValue(td, '');
                    });
                }
                else if (selected) {
                    // clear value of selected td
                    setValue(selected, '');
                }
            }
            else if (key === 9)  { /* TAB */
                if (!selected) {
                    return;
                }
                if (ev.target.tagName !== 'INPUT' || ev.target === input) {
                    ev.preventDefault();
                    pos = getCellPosition($table, selected);
                    offset = ev.shiftKey ? -1 : 1;
                    cell = getCellAt($table, pos.row, pos.column + offset)
                    if (cell) {
                        select.call($table, cell);
                    }
                }
            }
            else if (key === 13)  { /* ENTER */
                if (!selected) {
                    return;
                }
                if (ev.target === input) {
                    completeInlineEditor.call($table);
                    pos = getCellPosition($table, selected);
                    col = $table.data('spreadsheet:start-column');
                    if (col === undefined) {
                        col = pos.column;
                    }
                    cell = getCellAt($table, pos.row + 1, col)
                    // move to cell below if possible
                    if (cell) {
                        select.call($table, cell);
                    }
                }
                else if (selected && ev.target.tagName !== 'INPUT') {
                    editCell.call($table, selected);
                }
            }
            else if (ev.target.tagName !== 'INPUT') {
                if (!selected) {
                    return;
                }
                if (!ev.altKey && !ev.ctrlKey) {
                    editCell.call($table, selected, true);
                }
            }
        });
        $table.data('spreadsheet:bound', true);
    };


    /**
     * Public init function
     */

    $.fn.spreadsheet = function (options) {
        var $table = $(this),
            table,
            tbody,
            textarea,
            thead;

        _.defaults(options, {
            create: $.noop,
            data: [],
            remove: $.noop,
            save: $.noop
        })
        if (!options.columns) {
            throw new Error('You must define some columns');
        }

        table = $('<table class="spreadsheet"></table>');
        thead = createHeadings(options.columns);
        tbody = createBody(options.columns, options.data);

        table.append(thead).append(tbody);
        $table.html(table);
        $table.append(
            '<div class="spreadsheet-actions">' +
                '<a href="#" class="btn add-row-btn">' +
                    '<i class="icon-plus-sign"></i> Add row' +
                '</a>' +
                '<span class="row-counter"></span>' +
            '</div>'
        );

        textarea = $('<textarea id="spreadsheet_clipboard"></textarea>');
        $table.data('spreadsheet:clipboard', textarea);
        $table.after(textarea);

        bindDocumentEvents.call(this);
        bindTableEvents.call(this, options);
        $('.row-counter', this).text(options.data.length + ' rows');

        return this;
    };

})(jQuery);
