var proxyquire = require('proxyquire').noCallThru();

var kujua_utils = proxyquire('../../../../packages/kujua-utils/kujua-utils', {
    'cookies': {}
});
var kujua_sms_utils = proxyquire('../../../../packages/kujua-sms/kujua-sms/utils', {
    'kujua-utils': kujua_utils,
    'views/lib/objectpath': {},
    'underscore': require('underscore')
});
var smsparser = proxyquire('../../../../packages/kujua-sms/views/lib/textforms_parser', {
    'kujua-sms/utils': kujua_sms_utils
});

var def = {
    meta: {
        code: 'ANCR'
    },
    fields: {
        name: {
            labels: {
                short: 'Name',
                tiny: {
                    en: 'N',
                    sw: 'J'
                }
            },
            type: 'string'
        },
        lmp: {
            labels: {
                short: 'LMP',
                tiny: 'LMP'
            },
            type: 'integer'
        },
        somedate: {
            labels: {
                short: 'Date',
                tiny: 'D'
            },
            type: 'date'
        }
    }
};

exports['is compact true'] = function(test) {
    var doc = {
        message: 'sarah 24 2012-03-12'
    };

    test.ok(smsparser.isCompact(def, doc));
    test.done();
};

exports['is compact true when field value starts with field name'] = function(test) {
    var doc = {
        message: 'Norah 24 2012-03-12'
    };

    test.ok(smsparser.isCompact(def, doc));
    test.done();
};

exports['is compact false'] = function(test) {
    var doc = {
        message: 'n sarah lmp 24 d 2012-03-12'
    };

    test.ok(!smsparser.isCompact(def, doc));
    test.done();
};

exports['is compact false and respects locale property'] = function(test) {
    var doc = {
        message: 'j sarah lmp 24 d 2012-03-12',
        locale: 'sw'
    };

    test.ok(!smsparser.isCompact(def, doc, doc.locale));
    test.done();
};

exports['is compact false when field value starts with number'] = function(test) {
    var doc = {
        message: 'LMP24'
    };

    test.ok(!smsparser.isCompact(def, doc));
    test.done();
};

exports['is compact false when field value absent'] = function(test) {
    var doc = {
        message: 'lmp'
    };

    test.ok(!smsparser.isCompact(def, doc));
    test.done();
};

exports['is compact respects locale'] = function(test) {
    var doc = {
        message: 'lmp',
        locale: 'sw'
    };

    test.ok(!smsparser.isCompact(def, doc.message, doc.locale));
    test.done();
};
