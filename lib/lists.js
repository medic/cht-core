var templates = require('duality/templates'),
    events = require('duality/events'),
    pagination = require('kujua-pagination/pagination');

exports.sms_messages = function(head, req) {
    var row, rows = [];
    
    start({ code: 200, headers: {'Content-Type': 'text/html'} });

    events.once('afterResponse', function() {
        $('.page-header h1').text('SMS Messages');
        $('.nav > *').removeClass('active');
        $('.nav .admin').addClass('active');
        pagination.paginate(head, req, '/sms_messages');
    });

    while(row = getRow()) {
        rows.push(row.value);
    }

    rows = pagination.prepare(req, rows);
    
    return {
        content: templates.render('sms_messages_table.html', req, {
            sms_messages: rows
        })
    };
};
