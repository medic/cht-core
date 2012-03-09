var templates = require('duality/templates'),
    settings = require('settings/root'),
    events = require('duality/events'),
    pagination = require('kujua-pagination/pagination'),
    _ = require('underscore')._;

var makeDataRecordReadable = function(row) {
    var data_record = row.value;
    
    var sms_message = data_record.sms_message;
    if(sms_message) {
        sms_message.short_message = sms_message.message.substr(0, 40) + '...';
        sms_message.message = sms_message.message.replace(new RegExp('#', 'g'), "<br />");            
    }
    
    data_record.reported_date = new Date(data_record.reported_date).toDateString();
    
    return data_record;
};

exports.data_records = function(head, req) {
    var row, rows = [];
    
    start({ code: 200, headers: {'Content-Type': 'text/html'} });

    events.once('afterResponse', function() {
        $('.version').text(settings.version);
        $('.page-header h1').text('SMS Messages');
        $('.nav > *').removeClass('active');
        $('.nav .records').addClass('active');
        $('.next_url').val(window.location.href.match(/_rewrite(.*)$/)[1]);
        $('.extend').click(function(ev) {
            $(this).parents('tr').next().slideToggle();
        });
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
