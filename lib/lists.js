var templates = require('duality/templates'),
    events = require('duality/events');

exports.sms_messages = function(head, req) {
    start({ code: 200, headers: {'Content-Type': 'text/html'} });

    events.on('afterResponse', function() {
        $('.page-header h1').text('SMS Messages');
        $('.nav > *').removeClass('active');
        $('.nav .admin').addClass('active');
    });

    var row, rows = [];
    while (row = getRow()) {
        rows.push(row.value);
    };

    return {
        content: templates.render('sms_messages_table.html', req, {
            sms_messages: rows
        })
    };
};
