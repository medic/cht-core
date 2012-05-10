// TODO: select cell ranges

(function ($) {

    /**
     * Holds editor state etc.
     */

    $.spreadsheet = {};


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

        // loop through all parts of the path, throwing an exception
        // if a property doesn't exist
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


    var createRow = function (columns, doc) {
        var tr = $('<tr/>');
        tr.data('_id', doc._id);
        tr.append('<th class="handle"></th>');
        _.each(columns, function (c) {
            var p = getProperty(doc, c.property);
            var td = $('<td/>').text(p === undefined ? '': p.toString());
            td.data('property', c.property);
            tr.append(td);
        });
        return tr;
    };


    /**
     * Removes the input element used for inline-editing of cell values
     */

    var clearInlineEditor = function () {
        if ($.spreadsheet.edit_inline_input) {
            $($.spreadsheet.edit_inline_input).remove();
            delete $.spreadsheet.edit_inline_input;
            delete $.spreadsheet.edit_inline_td;
        }
    };


    /**
     * Updates the cell value with the value from the inline editor and
     * clears the inline editor input element
     */

    var completeInlineEditor = function () {
        var input = $.spreadsheet.edit_inline_input;
        var td = $.spreadsheet.edit_inline_td;
        if (td && input) {
            setValue(td, $(input).val());
        }
        clearInlineEditor();
    };


    /**
     * Clears exisitng inline-edit elements and creates a new one for the
     * provided td element
     */

    var editInline = function (td, clear_value) {
        clearInlineEditor();
        var offset = $(td).offset();
        var input = $('<input class="edit-inline" type="text" />').css({
            height: ($(td).outerHeight() - 3) + 'px',
            minWidth: ($(td).outerWidth() - 1) + 'px',
            position: 'absolute',
            top: offset.top,
            left: offset.left
        });
        if (clear_value) {
            input.val('');
        }
        else {
            input.val($(td).text());
        }
        $(td).parents('table').after(input);
        $.spreadsheet.edit_inline_input = $(input)[0];
        $.spreadsheet.edit_inline_td = $(td)[0];
        return input.focus();
    };


    /**
     * Change the selected cell to the provided td element
     */

    var select = function (td) {
        var div = $('#spreadsheet_select');
        var reselect = false;
        if (!div.length) {
            // previously unselected - this was causing some strange
            // problems with highlight positioning until the next
            // selection change, so force another selection change now
            reselect = true;
            div = $('<div id="spreadsheet_select" />');
            $(td).parents('table').after(div);
        }
        var offset = $(td).offset();
        div.css({
            width: $(td).outerWidth() - 3,
            height: $(td).outerHeight() - 3,
            top: offset.top,
            left: offset.left,
            position: 'absolute'
        });

        if (td === $.spreadsheet.selected_td) {
            // already selected
            return;
        }
        $.spreadsheet.selected_td = $(td)[0];
        $.spreadsheet.select_div = div;

        var table = $($.spreadsheet.selected_td).parents('table');
        $.spreadsheet.current_table = table;

        if (reselect) {
            select(td);
        }

        table.trigger('selectionChange');
    };


    /**
     * Clears the currently selected cell
     */

    var clearSelection = function () {
        var table = $($.spreadsheet.selected_td).parents('table');
        if ($.spreadsheet.select_div) {
            $($.spreadsheet.select_div).remove();
            delete $.spreadsheet.select_div;
            delete $.spreadsheet.selected_td;
        }
        table.trigger('selectionChange');
    };


    /**
     * Set the value of a cell. Changes the text inside the td element
     * and fires a change event
     */

    var setValue = function (td, val) {
        $(td).text(val);
        $(td).trigger('change');
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
        function _saveDoc() {
            if (!$(tr).data('save_queued')) {
                return;
            }
            if ($(tr).hasClass('saving')) {
                // _saveDoc will be called again once the current
                // save operation has completed
                return;
            }
            $(tr).data('save_queued', false);
            $(tr).addClass('saving');
            options.save(getDoc(tr, options), function (err, doc) {
                if (err) {
                    // TODO: do something better than alert
                    return alert(err.toString());
                }
                if (!doc || !doc._id) {
                    throw new Error(
                        'new doc must be returned to save callback'
                    );
                }
                updateDoc(doc, options);
                tr.removeClass('saving');
                _saveDoc();
            });
        }
        if ($(tr).data('save_queued')) {
            return;
        }
        else {
            // collect all save calls for this tick into a single save operation
            $(tr).data('save_queued', true);
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
    var updateActiveMarkers = function (table) {
        var ths = $('thead th', table);
        ths.removeClass('active');
        $('th.handle').removeClass('active');

        if ($.spreadsheet.range_tds) {
            var sc = $.spreadsheet.range_start_col;
            var ec = $.spreadsheet.range_end_col;
            for (var c = sc; c <= ec; c++) {
                $(ths[c + 1]).addClass('active');
            }
            var trs = $('tbody tr', table);
            var sr = $.spreadsheet.range_start_row;
            var er = $.spreadsheet.range_end_row;
            for (var r = sr; r <= er; r++) {
                $('th.handle', trs[r]).addClass('active');
            }
        }
        else {
            var selected = $.spreadsheet.selected_td;
            if (selected) {
                var pos = getCellPosition(table, selected);
                $(ths[pos.column + 1]).addClass('active');
            }
            if (selected) {
                $('th.handle', $(selected).parents('tr')).addClass('active');
            }
        }
    };


    var setRangeElements = function (table, start_td, end_td) {
        var start = getCellPosition(table, start_td);
        var end = getCellPosition(table, end_td);
        return setRange(table, start.column, start.row, end.column, end.row);
    };

    var setRange = function (table, start_col, start_row, end_col, end_row) {
        $('td.range', table).removeClass('range');
        var sc = Math.min(start_col, end_col);
        var ec = Math.max(start_col, end_col);
        var sr = Math.min(start_row, end_row);
        var er = Math.max(start_row, end_row);

        $.spreadsheet.range_tds = [];
        $.spreadsheet.range_start_col = sc;
        $.spreadsheet.range_end_col = ec;
        $.spreadsheet.range_start_row = sr;
        $.spreadsheet.range_end_row = er;

        for (var c = sc; c <= ec; c++) {
            for (var r = sr; r <= er; r++) {
                var cell = getCellAt(table, r, c);
                $(cell).addClass('range');
                $.spreadsheet.range_tds.push(cell);
            }
        }
        table.trigger('rangeChange');
    };


    var clearRange = function (table) {
        $('td.range', table).removeClass('range');
        delete $.spreadsheet.range_tds;
        delete $.spreadsheet.range_start_col;
        delete $.spreadsheet.range_end_col;
        delete $.spreadsheet.range_start_row;
        delete $.spreadsheet.range_end_row;
        table.trigger('rangeChange');
    };


    /**
     * Handles user interaction with the table
     */

    var bindTableEvents = function (table, options) {
        $(table).bind('rangeChange', function () {
            updateActiveMarkers(table);
        });
        $(table).bind('selectionChange', function () {
            clearRange(table);
            updateActiveMarkers(table);

            if (!$.spreadsheet.selected_td) {
                completeInlineEditor();
            }
            if ($.spreadsheet.edit_inline_td) {
                if ($.spreadsheet.edit_inline_td != $.spreadsheet.selected_td) {
                    completeInlineEditor();
                }
            }
            // scroll page to make new selection visible
            var s = $($.spreadsheet.selected_td);
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
        $(table).bind('change', function (ev) {
            // re-select td to make sure select box is properly resized.
            if ($.spreadsheet.selected_td) {
                select($.spreadsheet.selected_td);
            }
            // update row counter
            $('.row-counter', table).text(options.data.length + ' rows');
        });
        $(table).on('mousedown', 'td', function (ev) {
            ev.preventDefault();
            $('td', table).removeClass('active');
            var pos = getCellPosition(table, this);
            $.spreadsheet.start_column = pos.column;
            select(this);
            return false;
        });
        $('tbody td', table).mouseover(function (ev) {
            if (ev.which === 1 && $.spreadsheet.selected_td) {
                // left mouse button pressed and move started on table
                setRangeElements(table, $.spreadsheet.selected_td, this);
            }
        });
        $(table).on('change', 'tr', function (ev) {
            // TODO: don't save on every cell change, use a timeout and
            // wait until a different tr is selected if possible
            // TODO: check if doc has actually changed values
            var tr = $(this);
            saveDoc(tr, options);
        });
        $(table).on('change', 'td', function (ev) {
            // update doc value in spreadsheet data array
            var tr = $(this).parent();
            var doc = getDoc(tr, options);
            // TODO: coerce value to correct type depending on options
            setProperty(doc, $(this).data('property'), $(this).text());
        });
        $(table).on('click', '.spreadsheet-actions .add-row-btn', function (ev) {
            ev.preventDefault();
            addRow(table, options);
            return false;
        });
    };


    var bindDocumentEvents = function () {
        if ($.spreadsheet.document_bound) {
            // only bind these event handlers once
            return;
        }
        $(document).bind('cut', function (ev) {
            var td = $.spreadsheet.selected_td;
            if (td) {
                var val = $(td).text();
                var textarea = $($.spreadsheet.clipboard_textarea);
                textarea.val(val).focus().select();
                setTimeout(function () {
                    textarea.val('');
                    setValue(td, '');
                }, 0);
            }
        });
        $(document).bind('copy', function (ev) {
            var td = $.spreadsheet.selected_td;
            if (td) {
                var val = $(td).text();
                var textarea = $($.spreadsheet.clipboard_textarea);
                textarea.val(val).focus().select();
                setTimeout(function () {
                    textarea.val('');
                }, 0);
            }
        });
        $(document).bind('paste', function (ev) {
            if (ev.target.tagName !== 'INPUT') {
                $($.spreadsheet.clipboard_textarea).val('').focus();
                setTimeout(function () {
                    var val = $($.spreadsheet.clipboard_textarea).val();
                    var td = $.spreadsheet.selected_td;
                    if (td) {
                        setValue(td, val);
                    }
                }, 0);
            }
        });
        $(document).on('dblclick', '#spreadsheet_select', function (ev) {
            if ($.spreadsheet.selected_td) {
                editInline($.spreadsheet.selected_td);
            }
        });
        $(document).click(function (ev) {
            var el = $(ev.target);
            var input = $.spreadsheet.edit_inline_input;
            var select_div = $.spreadsheet.select_div;
            var table = $.spreadsheet.current_table;
            if (!el.is('td', table) && !el.is(input) && !el.is(select_div)) {
                clearSelection();
            }
        });
        $(document).keydown(function (ev) {
            var table = $.spreadsheet.current_table;
            var selected = $.spreadsheet.selected_td;
            var input = $.spreadsheet.edit_inline_input;

            if (!selected) {
                return;
            }

            if (ev.keyCode === 27)  { /* ESC */
                clearInlineEditor();
            }
            else if (ev.keyCode === 16)  { /* SHIFT */  return; }
            else if (ev.keyCode === 17)  { /* CTRL */   return; }
            else if (ev.keyCode === 18)  { /* ALT */    return; }
            else if (ev.keyCode === 38)  { /* UP */
                var pos = getCellPosition(table, selected);
                var cell = getCellAt(table, pos.row - 1, pos.column)
                if (cell) {
                    ev.preventDefault();
                    $.spreadsheet.start_column = pos.column;
                    select(cell);
                }
            }
            else if (ev.keyCode === 40)  { /* DOWN */
                var pos = getCellPosition(table, selected);
                var cell = getCellAt(table, pos.row + 1, pos.column)
                if (cell) {
                    ev.preventDefault();
                    $.spreadsheet.start_column = pos.column;
                    select(cell);
                }
            }
            else if (ev.keyCode === 37)  { /* LEFT */
                var pos = getCellPosition(table, selected);
                var cell = getCellAt(table, pos.row, pos.column - 1)
                if (cell) {
                    ev.preventDefault();
                    $.spreadsheet.start_column = pos.column - 1;
                    select(cell);
                }
            }
            else if (ev.keyCode === 39)  { /* RIGHT */
                var pos = getCellPosition(table, selected);
                var cell = getCellAt(table, pos.row, pos.column + 1)
                if (cell) {
                    ev.preventDefault();
                    $.spreadsheet.start_column = pos.column + 1;
                    select(cell);
                }
            }
            else if (ev.keyCode === 46)  { /* DEL */
                if (ev.target.tagName !== 'INPUT') {
                    // clear value of selected td
                    setValue(selected, '');
                }
            }
            else if (ev.keyCode === 9)  { /* TAB */
                if (ev.target.tagName !== 'INPUT' || ev.target === input) {
                    ev.preventDefault();
                    var pos = getCellPosition(table, selected);
                    var cell = getCellAt(table, pos.row, pos.column + 1)
                    if (cell) {
                        select(cell);
                    }
                }
            }
            else if (ev.keyCode === 13)  { /* ENTER */
                // TODO: google docs will return to the first edited column
                // on the row below. Eg, you edit A2 then TAB and edit A3 and
                // press ENTER it will move to B2.
                // - interestingly, this only happens when using TAB to move
                //   between cells, if I edit A2, then RIGHT ARROW, then edit
                //   A3, then hit ENTER it will move to B3 (not B2)
                if (ev.target === input) {
                    completeInlineEditor();
                    var pos = getCellPosition(table, selected);
                    var col = $.spreadsheet.start_column;
                    if (col === undefined) {
                        col = pos.column;
                    }
                    var cell = getCellAt(table, pos.row + 1, col)
                    // move to cell below if possible
                    if (cell) {
                        select(cell);
                    }
                }
                else if (selected && ev.target.tagName !== 'INPUT') {
                    editInline(selected);
                }
            }
            else if (ev.target.tagName !== 'INPUT') {
                if (!ev.altKey && !ev.ctrlKey) {
                    editInline(selected, true);
                }
            }
        });
        $.spreadsheet.document_bound = true;
    };


    /**
     * Public init function
     */

    $.fn.spreadsheet = function (options) {
        options.data = options.data || [];
        if (!options.columns) {
            throw new Error('You must define some columns');
        }

        var table = $('<table class="spreadsheet"></table>');
        var thead = createHeadings(options.columns);
        var tbody = createBody(options.columns, options.data);

        table.append(thead).append(tbody);
        $(this).html(table);
        $(this).append(
            '<div class="spreadsheet-actions">' +
                '<a href="#" class="btn add-row-btn">' +
                    '<i class="icon-plus-sign"></i> Add row' +
                '</a>' +
                '<span class="row-counter"></span>' +
            '</div>'
        );

        var textarea = $('<textarea id="spreadsheet_clipboard"></textarea>');
        $.spreadsheet.clipboard_textarea = textarea;
        $(this).after(textarea);

        bindDocumentEvents();
        bindTableEvents(this, options);
        $('.row-counter', this).text(options.data.length + ' rows');

        return this;
    };

})(jQuery);
