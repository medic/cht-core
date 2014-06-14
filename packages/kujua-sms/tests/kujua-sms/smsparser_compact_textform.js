var smsparser = require('views/lib/smsparser');

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
