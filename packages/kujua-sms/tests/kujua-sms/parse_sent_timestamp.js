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
    var data,
        req,
        resp,
        resp_body;

    data = {
        from: '+13125551212',
        message: "1!TEST!facility#2011",
        sent_timestamp: timestamp,
        sent_to: '+15551212'
    };

    req = {
        uuid: '14dc3a5aa6',
        method: "POST",
        headers: helpers.headers("url", querystring.stringify(data)),
        body: querystring.stringify(data),
        form: data
    };

    resp = fakerequest.update(updates.add_sms, data, req);

    resp_body = JSON.parse(resp[1].body);

    return new Date(resp_body.callback.data.reported_date);
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
