var templates = require('duality/templates'),
    events = require('duality/events'),
    logger = require('kujua-utils').logger,
    utils = require('./utils'),
    pagination = require('kujua-pagination/pagination'),
    _ = require('underscore')._;


// for use with form_data attribute
// return html string to use in template
var formDataToHTML = function(json) {
    if (typeof json === 'undefined' || typeof $ === 'undefined') {
        return;
    }
    var headers = $('<tr/>'),
        data = $('<tr/>');
    for (var k in json) {
        if ($.isArray(json[k])) {
            headers.append($('<th>' + json[k][1] + '</th>'));
            data.append($('<td>' + json[k][0] + '</td>'));
        } else if (typeof json[k] === 'object') {
            headers.append($('<th>' + utils.titleize(k) + '</th>'));
            data.append($('<td>' + formDataToHTML(json[k]) + '</td>'));
        }
    }
    // .html will return inner so wrapping in <div>
    // return table html
    return $('<div/>').append(
        $('<table class="form-data"/>').append(
            $('<thead/>').append(headers),
            $('<tbody/>').append(data))).html();
};

var makeDataRecordReadable = function(row) {
    var data_record = row.value;

    var sms_message = data_record.sms_message;
    if(sms_message) {
        sms_message.short_message = sms_message.message.substr(0, 40) + '...';
        sms_message.message = sms_message.message.replace(new RegExp('#', 'g'), "<br />");
    }

    var form_data = data_record.form_data;
    if (form_data) {
        form_data._html = formDataToHTML(form_data);
    }
    data_record.reported_date = new Date(data_record.reported_date).toDateString();

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
