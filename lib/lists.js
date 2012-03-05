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

    var sortBy = req.query.sortBy || 'sent_timestamp';
    rows.sort(function(a, b) {
        if (a[sortBy] < b[sortBy]) {
            return -1;
        } else if(a[sortBy] > b[sortBy]) {
            return 1;
        } else {
            return 0;
        }
    });
    
    return {
        content: templates.render('sms_messages_table.html', req, {
            sms_messages: rows
        })
    };
};
