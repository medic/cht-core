var templates = require('duality/templates'),
    settings = require('settings/root'),
    events = require('duality/events'),
    pagination = require('kujua-pagination/pagination'),
    _ = require('underscore')._;

exports.sms_messages = function(head, req) {
    var row, rows = [];
    
    start({ code: 200, headers: {'Content-Type': 'text/html'} });

    events.once('afterResponse', function() {
        $('.version').text(settings.version);
        $('.page-header h1').text('SMS Messages');
        $('.nav > *').removeClass('active');
        $('.nav .admin').addClass('active');
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
    rows = _.map(rows, function(row) {
        row.value.short_message = row.value.message.substr(0, 40) + '...';
        row.value.message = row.value.message.replace(new RegExp('#', 'g'), "<br />");
        return row.value;
    });
    
    return {
        content: templates.render('sms_messages_table.html', req, {
            sms_messages: rows
        })
    };
};
