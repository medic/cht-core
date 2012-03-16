var templates = require('duality/templates'),
    events = require('duality/events'),
    logger = require('kujua-utils').logger,
    utils = require('./utils'),
    sms_utils = require('kujua-sms/utils'),
    pagination = require('kujua-pagination/pagination'),
    cookies = require('cookies'),
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
        var associated_district = cookies.readBrowserCookie('KE_user_district');

        var urlParams = function(perPage, filter) {
            return '?perPage=' + perPage +
            '&amp;filter=' + filter +
            '&amp;limit=' + (parseInt(perPage, 10) + 1) + 
            '&amp;startkey=%5B%22' + filter + '%22%5D';
        };

        if(req.query.filter === associated_district) {
            // Avoid binding events here because it causes them to accumulate on
            // each request.  Possibly add them to init handler in lib/events.js.
            $('.page-header h1').text('Records');
            $('.nav > *').removeClass('active');
            $('.nav .records').addClass('active');

            var db = require('db').current();

            // render available downloads based on data available
            db.getView('kujua-export', 'district_hospitals_from_data_records', {group: true}, function(err, data) {
                if (err) {
                    return alert(err);
                }

                $('.dropdown-menu.district-hospitals').html('');
                _.each(data.rows, function(dh) {
                    var name = dh.key[1] || dh.key[0];
                    var li = '<li><a href="' +
                             urlParams(pagination.perPage, dh.key[0]) +
                             '">' + name + '</a></li>';

                    $('.dropdown-menu.district-hospitals').append(li);
                });

                $('.controls').show();
            });

            if(req.query.filter) {
                $('.dropdown-menu.limits a').each(function(idx, link) {
                    var perPage = $(link).attr('href').match(/perPage=(\d+)/)[1];                
                    $(link).replaceWith('<a href="' + urlParams(perPage, req.query.filter) + '">' + perPage + '</a>');
                });
            }

            if ($('.edit').hasClass('active')) {
                $('.edit-col').show();
            } else {
                $('.edit-col').hide();
            };

            pagination.paginate(head, req, '/' + req.path[2], rows);
        } else {
            window.location.search = '?perPage=' + pagination.perPage +
            '&filter=' + associated_district +
            '&limit=' + (pagination.perPage + 1) + 
            '&startkey=["' + associated_district + '"]';
        }        
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
