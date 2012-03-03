var templates = require('duality/templates'),
    events = require('duality/events'),
    utils = require('kujua-utils'),
    _ = require('underscore')._;

exports.data_records = function(head, req) {
    start({ code: 200, headers: {'Content-Type': 'text/html'} });

    events.on('afterResponse', function() {
        $('.page-header h1').text('Data Records');
        $('.nav > *').removeClass('active');
        $('.nav .admin').addClass('active');
    });

    var row, rows = [];
    while (row = getRow()) {
        var data_record = row.value;
        if(_.isNumber(data_record.month)) {
            data_record.month = utils.prettyMonth(data_record.month);
        }
        rows.push(data_record);
    };

    return {
        title: 'Data Records',
        content: templates.render('data_records_table.html', req, {
            data_records: rows
        })
    };
};
