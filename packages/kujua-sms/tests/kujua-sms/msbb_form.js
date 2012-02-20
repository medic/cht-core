var smsparser = require('views/lib/smsparser'),
    smsforms = require('views/lib/smsforms');


exports.msbb_example_data = function (test) {
    var def = smsforms['MSBB'];
    var doc = {
        sent_timestamp: '2-1-12 15:35',
        from: '+13125551212',
        message: '1!MSBB!2012#2#1#12345678901#1111#bbbbbbbbbbbbbbbbbbbb#22#15#cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
    };

    test.expect(2);

    var obj = smsparser.parse(def, doc);
    var expectedObj = {
        ref_year: '2012',
        ref_month: '2',
        ref_day: 1,
        ref_rc: 12345678901,
        ref_hour: '1111',
        ref_name: 'bbbbbbbbbbbbbbbbbbbb',
        ref_age: 22,
        ref_reason: 'Autres',
        ref_reason_other: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
    };

    test.same(obj, expectedObj);

    var arr = smsparser.parseArray(def, doc);
    var expectedArr = ['2-1-12 15:35', '+13125551212', '2012', '2', 1, 12345678901, '1111', 'bbbbbbbbbbbbbbbbbbbb', 22, 'Autres', 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc']

    test.same(arr, expectedArr);

    test.done();
};
