var templates = require('duality/templates'),
    events = require('duality/events'),
    logger = require('kujua-utils').logger,
    utils = require('./utils'),
    sms_utils = require('kujua-sms/utils'),
    pagination = require('kujua-pagination/pagination'),
    _ = require('underscore')._;


var fieldsToHtml = function(keys, labels, data_record) {
    var fields = {
        headers: [],
        data: []
    };
    
    _.each(keys, function(key) {
        if(_.isArray(key)) {
            fields.headers.push({head: utils.titleize(key[0])});
            fields.data.push(_.extend(
                fieldsToHtml(key[1], labels, data_record[key[0]]), 
                {isArray: true}
            ));
        } else {
            fields.headers.push({head: labels.shift()});
            fields.data.push({
                isArray: false,
                value: data_record[key]
            });
        }
    });
    
    return fields;
};

var makeDataRecordReadable = function(row) {
    var data_record = row.value;

    var sms_message = data_record.sms_message;
    if(sms_message) {
        sms_message.short_message = sms_message.message.substr(0, 40) + '...';
        sms_message.message = sms_message.message.replace(new RegExp('#', 'g'), "<br />");
    }

    if(data_record.form) {
        var keys = sms_utils.getFormKeys(data_record.form);
        var labels = sms_utils.getLabels(keys, data_record.form, 'en');
        data_record.fields = fieldsToHtml(keys, labels, data_record);
    }
    
    data_record.reported_date = new Date(data_record.reported_date).
                                        toLocaleString().
                                        match(/^(.*\d{2}\:\d{2}\:\d{2})/)[1];

    return data_record;
};

exports.data_records = function(head, req) {
    var row, rows = [];

    start({ code: 200, headers: {'Content-Type': 'text/html'} });

    events.once('afterResponse', function() {
        // Avoid binding events here because it causes them to accumulate on
        // each request.  Possibly add them to init handler in lib/events.js.
        $('.page-header h1').text('Records');
        $('.nav > *').removeClass('active');
        $('.nav .records').addClass('active');
        $('.controls').show();
        if ($('.edit').hasClass('active')) {
            $('.edit-col').show();
        } else {
            $('.edit-col').hide();
        };
        pagination.paginate(head, req, '/' + req.path[2]);
    });

    while(row = getRow()) {
        rows.push(row);
    }

    rows = pagination.prepare(req, rows);
    rows = _.map(rows, makeDataRecordReadable);

    return {
        content: templates.render('data_records_table.html', req, {
            data_records: rows
        })
    };
};
