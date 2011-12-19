/**
 * List functions to be exported from the design doc.
 */

var smsforms = require('views/lib/smsforms'),
    _ = require('underscore')._;


function arrayToCSV (arr, delimiter) {
    var rows = [],
        delimiter = delimiter || '","';

    for (var r = 0; r < arr.length; r++) {
        var row = arr[r];
        var vals = [];
        for (var v = 0; v < row.length; v++) {
            var val = row[v];
            if (typeof val === 'string') {
                vals.push(val.replace(/"/g, '""'));
            }
            else {
                vals.push(val);
            }
        }
        rows.push('"' + vals.join(delimiter) + '"');
    }
    return rows.join('\n');
};


exports.sms_messages_csv = function (head, req) {

    var form_name = req.query.form;
        def = smsforms[form_name],
        filename = def ? form_name + '_sms_messages.csv': 'unknown_form.csv',
        locale = req.query.locale || 'en',
        delimiter = locale === 'fr' ? '";"' : null;

    start({code: 200, headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename=' + filename
    }});

    var row, rows = [];
    while (row = getRow()) {
        rows.push(row);
    }

    if (def) {
        var headings = _.map(def.fields, function (r) {
            return r.label || r.key;
        });
        var data = _.map(rows, function(r) {
            return r.value ? r.value : '';
        });
        data.unshift(headings);
        // Prepend BOM for MS Excel compat
        return '\uFEFF' + arrayToCSV(data, delimiter);
    }

    // It would be nice to do a 404 page here, but we've already started the
    // request with a 200 response and test/csv mime type - thanks couch!
    // At the top of this function the filename is set to unknown_form.csv
    // when the form def can't be found
    return '';
};
