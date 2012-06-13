var smsparser = require('views/lib/smsparser'),
    jsonforms = require('views/lib/jsonforms');

exports.msbb_example_data = function (test) {
    test.expect(2);

    var def = jsonforms['MSBB'];
    var doc = {
        sent_timestamp: '2-1-12 15:35',
        from: '+13125551212',
        message: '1!MSBB!2012#2#1#12345678901#1111#bbbbbbbbbbbbbbbbbbbb#22#15#cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
    };

    var obj = smsparser.parse(def, doc);
    var expectedObj = {
        ref_year: 2012,
        ref_month: 2,
        ref_day: 1,
        ref_rc: '12345678901',
        ref_hour: 1111,
        ref_name: 'bbbbbbbbbbbbbbbbbbbb',
        ref_age: 22,
        ref_reason: 'Autres',
        ref_reason_other: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
    };

    test.same(obj, expectedObj);

    msbb_example_data_with_only_required_fields(test);
};

var msbb_example_data_with_only_required_fields = function (test) {
    var def = jsonforms['MSBB'];
    var doc = {
        sent_timestamp: '2-1-12 15:35',
        from: '+13125551212',
        message: '1!MSBB!2012#1#24###bbbbbb'
    };

    var obj = smsparser.parse(def, doc);
    var expectedObj = {
        ref_year: '2012',
        ref_month: '1',
        ref_day: 24,
        ref_rc: null,
        ref_hour: null,
        ref_name: 'bbbbbb',
        ref_age: undefined,
        ref_reason: undefined,
        ref_reason_other: undefined
    };

    test.same(obj, expectedObj);
    
    test.done();
};
