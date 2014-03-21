var smsparser = require('views/lib/smsparser'),
    jsonforms = require('views/lib/jsonforms');

exports['compact textforms format'] = function(test) {
    var doc = {
        sent_timestamp: '1-13-12 15:35',
        from: '+15551212',
        message: 'ANCR sarah 24'
    };
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
            }
        }
    };
    var expectedObj = {
        name: 'sarah',
        lmp: 24
    };

    var obj = smsparser.parse(def, doc);
    test.same(obj, expectedObj);
    test.done();
};