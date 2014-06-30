var updates = require('kujua-sms/updates'),
    fakerequest = require('couch-fakerequest'),
    moment = require('moment');

function process(timestamp) {

    var req = {
        headers: {"Host": window.location.host},
        form: {
            "from":"+888",
            "message":"hmm this is test",
            "sent_timestamp": timestamp
        }
    };

    var resp = fakerequest.update(updates.add_sms, null, req);

    return new Date(resp[0].reported_date);
}

exports.timestamp_parsing_without_seconds = function (test) {
    var reported_date = process( '01-19-12 18:45');

    test.equals(reported_date.getMilliseconds(), 0);
    test.equals(reported_date.getSeconds(), 0);
    test.done();
};

exports.timestamp_parsing_boundaries = function (test) {
    var reported_date = process( '1-9-99 8:45:59');

    test.equals(reported_date.getMilliseconds(), 0);
    test.equals(reported_date.getSeconds(), 59);
    test.equals(reported_date.getFullYear(), 2099);
    test.equals(reported_date.getMonth(), 0);
    test.equals(reported_date.getDate(), 9);
    test.equals(reported_date.getHours(), 8);
    test.equals(reported_date.getMinutes(), 45);
    test.done();
};

exports.timestamp_parsing_with_seconds = function (test) {
    var reported_date = process( '01-19-12 18:45:59');

    test.equals(reported_date.getMilliseconds(), 0);
    test.equals(reported_date.getSeconds(), 59);
    test.done();
};

exports.ms_since_epoch = function (test) {
    var time = '1352659197736';
    var reported_date = process(time);

    test.equals(reported_date.getMilliseconds(), 736);
    test.equals(reported_date.getSeconds(), 57);
    test.done();
};

exports['support moment.js compat dates'] = function (test) {
    var time = 'Apr 11, 2021 18:00 +0800',
        reported_date = process(time);

    test.equals(reported_date.valueOf(), moment(time).valueOf());
    test.done();
};

