var templates = require('duality/templates'),
    events = require('duality/events'),
    pagination = require('kujua-pagination/pagination');

exports.sms_messages = function(head, req) {
    var row, rows = [], lastSMS, firstSMS;
    
    start({ code: 200, headers: {'Content-Type': 'text/html'} });

    events.once('afterResponse', function() {
        $('.page-header h1').text('SMS Messages');
        $('.nav > *').removeClass('active');
        $('.nav .admin').addClass('active');
        firstSMS = rows[0];
        pagination.paginate(head, req, firstSMS, lastSMS, '/sms_messages');
    });

    while(row = getRow()) {
        rows.push(row.value);
    }
    
    if(req.query.descending) {
        rows.reverse();
    }

    if(rows.length > pagination.perPage) {
        lastSMS = rows.pop();
    }    
    
    return {
        content: templates.render('sms_messages_table.html', req, {
            sms_messages: rows
        })
    };
};
