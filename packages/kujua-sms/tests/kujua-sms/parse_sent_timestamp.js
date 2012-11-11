var updates = require('kujua-sms/updates'),
    lists = require('kujua-sms/lists'),
    logger = require('kujua-utils').logger,
    baseURL = require('duality/core').getBaseURL(),
    appdb = require('duality/core').getDBURL(),
    querystring = require('querystring'),
    jsDump = require('jsDump'),
    fakerequest = require('couch-fakerequest'),
    helpers = require('../../test-helpers/helpers');


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
