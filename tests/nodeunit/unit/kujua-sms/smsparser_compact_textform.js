var proxyquire = require('proxyquire').noCallThru();

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

var def = {
    meta: {
        code: 'ANCR'
    },
    fields: {
        name: {
            labels: {
                short: 'Name',
                tiny: 'N'
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

exports['compact textforms format'] = function(test) {
    var doc = {
        sent_timestamp: '1-13-12 15:35',
        from: '+15551212',
        message: 'ANCR sarah 24 2012-03-12'
    };

    var expectedObj = {
        name: 'sarah',
        lmp: 24,
        somedate: 1331510400000
    };

    var obj = smsparser.parse(def, doc);
    test.same(obj, expectedObj);
    test.done();
};

exports['compact textforms format with hash separated form code'] = function(test) {
    var doc = {
        sent_timestamp: '1-13-12 15:35',
        from: '+15551212',
        message: 'ANCR#sarah'
    };

    var expectedObj = {
        name: 'sarah'
    };

    var obj = smsparser.parse(def, doc);
    test.same(obj, expectedObj);
    test.done();
};

exports['compact textforms format with exclaimation separated form code'] = function(test) {
    var doc = {
        sent_timestamp: '1-13-12 15:35',
        from: '+15551212',
        message: 'ANCR!sarah'
    };

    var expectedObj = {
        name: 'sarah'
    };

    var obj = smsparser.parse(def, doc);
    test.same(obj, expectedObj);
    test.done();
};

exports['compact textforms format with hyphen separated form code'] = function(test) {
    var doc = {
        sent_timestamp: '1-13-12 15:35',
        from: '+15551212',
        message: 'ANCR-sarah'
    };

    var expectedObj = {
        name: 'sarah'
    };

    var obj = smsparser.parse(def, doc);
    test.same(obj, expectedObj);
    test.done();
};

exports['compact textforms format uses quotes for multiple words'] = function(test) {
    var doc = {
        sent_timestamp: '1-13-12 15:35',
        from: '+15551212',
        message: 'ANCR "Sarah Connor" 24 2012-03-12'
    };

    var expectedObj = {
        name: 'Sarah Connor',
        lmp: 24,
        somedate: 1331510400000
    };

    var obj = smsparser.parse(def, doc);
    test.same(obj, expectedObj);
    test.done();
};

exports['compact textforms format handles quotes in quotes'] = function(test) {
    var doc = {
        sent_timestamp: '1-13-12 15:35',
        from: '+15551212',
        message: 'ANCR "Sarah "killer bee" Connor" 24 2012-03-12'
    };
    var expectedObj = {
        name: 'Sarah \"killer bee\" Connor',
        lmp: 24,
        somedate: 1331510400000
    };
    var obj = smsparser.parse(def, doc);
    test.same(obj, expectedObj);
    test.done();
};

exports['compact textforms handles too few fields'] = function(test) {
    var doc = {
        sent_timestamp: '1-13-12 15:35',
        from: '+15551212',
        message: 'ANCR "Sarah Connor" 24'
    };

    var expectedObj = {
        name: 'Sarah Connor',
        lmp: 24
    };

    var obj = smsparser.parse(def, doc);
    test.same(obj, expectedObj);
    test.done();
};


exports['compact textforms handles too many fields'] = function(test) {
    var doc = {
        sent_timestamp: '1-13-12 15:35',
        from: '+15551212',
        message: 'ANCR "Sarah Connor" 24 2012-03-12 comment'
    };

    var expectedObj = {
        name: 'Sarah Connor',
        lmp: 24,
        somedate: 1331510400000
    };

    var obj = smsparser.parse(def, doc);
    test.same(obj, expectedObj);
    test.done();
};

exports['if last field is a string then quotes are optional'] = function(test) {
    var doc = {
        sent_timestamp: '1-13-12 15:35',
        from: '+15551212',
        message: 'CHAT sarah reduced fetal movements'
    };
    var def = {
        meta: {
            code: 'CHAT'
        },
        fields: {
            name: {
                labels: {
                    short: 'Name',
                    tiny: 'N'
                },
                type: 'string'
            },
            comment: {
                labels: {
                    short: 'Comment',
                    tiny: 'C'
                },
                type: 'string'
            }
        }
    };

    var expectedObj = {
        name: 'sarah',
        comment: 'reduced fetal movements'
    };

    var obj = smsparser.parse(def, doc);
    test.same(obj, expectedObj);
    test.done();
};

exports['compact textforms handles mismatched types'] = function(test) {
    var doc = {
        sent_timestamp: '1-13-12 15:35',
        from: '+15551212',
        message: 'ANCR sarah abc 2012-03-12'
    };

    var expectedObj = {
        name: 'sarah',
        lmp: null,
        somedate: 1331510400000
    };

    var obj = smsparser.parse(def, doc);
    test.same(obj, expectedObj);
    test.done();
};

var defR = {
    meta: {
        code: 'R'
    },
    fields: {
        name: {
            labels: {
                short: 'Name',
                tiny: 'N'
            },
            type: 'string'
        }
    }
};

exports['compact textforms handles registrations starting with N'] = function(test) {
    var doc = {
        sent_timestamp: '1-13-12 15:35',
        from: '+15551212',
        message: 'R North West'
    };

    var expectedObj = {
        name: 'North West'
    };

    var obj = smsparser.parse(defR, doc);
    test.same(obj, expectedObj);
    test.done();
};
