var templates = require('duality/templates'),
    lutils = require('./utils'),
    _ = require('underscore')._;

exports.data_records = function(head, req) {
    start({ code: 200, headers: {'Content-Type': 'text/html'} });

    var row, rows = [];
    while (row = getRow()) {
        var data_record = row.value;
        if(_.isNumber(data_record.month)) {
            data_record.month = lutils.prettyMonth(data_record.month);
        }
        rows.push(data_record);
    };

    return {
        title: 'Data Records',
        content: templates.render('data_records.html', req, {
            data_records: rows
        })
    };
};