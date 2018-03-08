var proxyquire = require('proxyquire').noCallThru(),
    fakerequest = require('../../couch-fakerequest');

var validate = require('../../../../packages/kujua-sms/kujua-sms/validate');
var kujua_sms_utils = proxyquire('../../../../packages/kujua-sms/kujua-sms/utils', {
    'views/lib/objectpath': {},
    'underscore': require('underscore')
});
var textforms_parser = proxyquire('../../../../packages/kujua-sms/views/lib/textforms_parser', {
    'kujua-sms/utils': kujua_sms_utils
});
var javarosa_parser = proxyquire('../../../../packages/kujua-sms/views/lib/javarosa_parser', {
    'kujua-sms/utils': kujua_sms_utils
});
var smsparser = proxyquire('../../../../packages/kujua-sms/views/lib/smsparser', {
    'kujua-sms/utils': kujua_sms_utils,
    './javarosa_parser': javarosa_parser,
    './textforms_parser': textforms_parser
});
var libphonenumber = proxyquire('../../../../packages/libphonenumber/libphonenumber/utils', {
  'libphonenumber/libphonenumber': require('../../../../packages/libphonenumber/libphonenumber/libphonenumber')
});
var updates = proxyquire('../../../../packages/kujua-sms/kujua-sms/updates', {
    'moment': require('../../../../packages/moment/moment'),
    'views/lib/appinfo': {},
    'views/lib/smsparser': smsparser,
    'libphonenumber/utils': libphonenumber,
    './validate': validate,
    './utils': kujua_sms_utils
});

function process(timestamp) {

    var req = {
        headers: { Host: 'localhost'},
        form: {
            from: '+888',
            message: 'hmm this is test',
            sent_timestamp: timestamp
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

    test.equals(reported_date.valueOf(), 1618135200000);
    test.done();
};

