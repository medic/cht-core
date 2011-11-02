/**
 * List functions to be exported from the design doc.
 */

var smsforms = require('views/lib/smsforms'),
    _ = require('underscore')._;


function arrayToCSV (arr) {
    var rows = [];
    for (var r = 0; r < arr.length; r++) {
        var row = arr[r];
        var vals = [];
        for (var v = 0; v < row.length; v++) {
            var val = row[v];
            if (typeof val === 'string' &&
                (val.indexOf(',') !== -1 || val.indexOf('"') !== -1)) {
                vals.push('"' + val.replace(/"/g, '""') + '"');
            }
            else {
                vals.push(val);
            }
        }
        rows.push(vals.join(','));
    }
    return rows.join('\n');
};


exports.sms_messages_csv = function (head, req) {
    var form_name = req.query.form;
    var def = smsforms[form_name];
    var filename = def ? form_name + '_sms_messages.csv': 'unknown_form.csv';
    start({code: 200, headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=' + filename
    }});
    var row, rows = [];
    while (row = getRow()) {
        rows.push(row);
    }
    if (def) {
        var headings = _.map(def, function (r) {
            return r.label || r.key;
        });
        var data = rows[0] ? rows[0].value: '';
        return arrayToCSV([headings]) + '\n' + data;
    }
    // It would be nice to do a 404 page here, but we've already started the
    // request with a 200 response and test/csv mime type - thanks couch!
    // At the top of this function the filename is set to unknown_form.csv
    // when the form def can't be found
    return '';
};
