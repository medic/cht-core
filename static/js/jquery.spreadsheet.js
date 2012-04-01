// TODO: select cell ranges

(function ($) {

    /**
     * Holds editor state etc.
     */

    $.spreadsheet = {};


    /**
     * returns a unique, sorted list of all keys in use
     * by the objects in the data array
     */

    var getDataKeys = function (data) {
        var nested = _.map(data, function (row) {
            return _.keys(row);
        });
        return _.uniq(_.flatten(nested).sort(), true);
    };


    /**
     * Creates a thead element for the given unique key list.
     */

    var createHeadings = function (keys) {
        var thead = $('<thead/>');
        var thead_tr = $('<tr/>');
        thead.append(thead_tr);

        _.each(keys, function (k) {
            var th = $('<th/>').text(k);
            thead_tr.append(th);
        });

        return thead;
    };


    /**
     * Creates a tbody element for the given keys and data
     */

    var createBody = function (keys, data) {
        var tbody = $('<tbody/>');

        _.each(data, function (row) {
            var tr = $('<tr/>');
            tbody.append(tr);

            _.each(keys, function (k) {
                var td = $('<td/>').text(row[k] ? JSON.stringify(row[k]): '');
                tr.append(td);
            });
        });
        return tbody;
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
        $(document.body).append(input);
        $.spreadsheet.edit_inline_input = $(input)[0];
        $.spreadsheet.edit_inline_td = $(td)[0];
        return input.focus();
    };


    /**
     * Change the selected cell to the provided td element
     */

    var select = function (td) {
        var div = $('#spreadsheet_select');
        if (!div.length) {
            div = $('<div id="spreadsheet_select" />');
            $(document.body).append(div);
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


    /**
     * Handles user interaction with the table
     */

    var bindEvents = function (table) {
        $(table).bind('selectionChange', function () {
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
                console.log([
                    'offset.top', offset.top,
                    'max_y', max_y,
                    'scroll_y', scroll_y
                ]);
                if (offset.top > max_y) {
                    console.log('scrollTop');
                    $(window).scrollTop(scroll_y + (offset.top - max_y) + 1);
                }
                // TODO: 41 is the height of the navbar on KE, make this
                // configurable
                else if (offset.top - 41 < scroll_y) {
                    console.log('scroll up');
                    $(window).scrollTop(offset.top - 41);
                }
                var scroll_x = $(window).scrollLeft();
                var max_x = scroll_x + $(window).width() - s.outerWidth();
                console.log([
                    'offset.left', offset.left,
                    'max_x', max_x,
                    'scroll_x', scroll_x
                ]);
                if (offset.left > max_x) {
                    console.log('scrollLeft');
                    $(window).scrollLeft(scroll_x + (offset.left - max_x) + 1);
                }
                else if (offset.left < scroll_x) {
                    $(window).scrollLeft(offset.left);
                }
            }
        });
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
        $('#spreadsheet_select').live('dblclick', function (ev) {
            if ($.spreadsheet.selected_td) {
                editInline($.spreadsheet.selected_td);
            }
        });
        $('td', table).live('click', function (ev) {
            $('td', table).removeClass('active');
            select(this);
        });
        $('td', table).live('change', function (ev) {
            // re-select td to make sure select box is properly resized.
            if ($.spreadsheet.selected_td) {
                select($.spreadsheet.selected_td);
            }
        });
        $(document).click(function (ev) {
            var el = $(ev.target);
            var input = $.spreadsheet.edit_inline_input;
            var select_div = $.spreadsheet.select_div;
            if (!el.is('td', table) && !el.is(input) && !el.is(select_div)) {
                clearSelection();
            }
        });
        $(document).keydown(function (ev) {
            console.log(['keydown', ev]);
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
                ev.preventDefault();
                var pos = getCellPosition(table, selected);
                var cell = getCellAt(table, pos.row - 1, pos.column)
                if (cell) {
                    select(cell);
                }
            }
            else if (ev.keyCode === 40)  { /* DOWN */
                ev.preventDefault();
                var pos = getCellPosition(table, selected);
                var cell = getCellAt(table, pos.row + 1, pos.column)
                if (cell) {
                    select(cell);
                }
            }
            else if (ev.keyCode === 37)  { /* LEFT */
                ev.preventDefault();
                var pos = getCellPosition(table, selected);
                var cell = getCellAt(table, pos.row, pos.column - 1)
                if (cell) {
                    select(cell);
                }
            }
            else if (ev.keyCode === 39)  { /* RIGHT */
                ev.preventDefault();
                var pos = getCellPosition(table, selected);
                var cell = getCellAt(table, pos.row, pos.column + 1)
                if (cell) {
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
                ev.preventDefault();
                var pos = getCellPosition(table, selected);
                var cell = getCellAt(table, pos.row, pos.column + 1)
                if (cell) {
                    select(cell);
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
                    // move to cell below if possible
                    var pos = getCellPosition(table, selected);
                    var cell = getCellAt(table, pos.row + 1, pos.column)
                    if (cell) {
                        select(cell);
                    }
                }
                else if (selected) {
                    editInline(selected);
                }
            }
            else if (ev.target.tagName !== 'INPUT') {
                if (!ev.altKey && !ev.ctrlKey) {
                    editInline(selected, true);
                }
            }
        });
    };


    /**
     * Public init function
     */

    $.fn.spreadsheet = function (options) {
        options.data = options.data || [];
        options.keys = options.keys || getDataKeys(options.data);

        var table = $('<table class="spreadsheet"></table>');
        var thead = createHeadings(options.keys);
        var tbody = createBody(options.keys, options.data);

        table.append(thead).append(tbody);
        $(this).html(table);

        var textarea = $('<textarea id="spreadsheet_clipboard"></textarea>');
        $.spreadsheet.clipboard_textarea = textarea;
        $(this).append(textarea);

        bindEvents(this);

        return this;
    };

})(jQuery);
