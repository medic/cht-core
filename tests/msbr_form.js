var smsparser = require('views/lib/smsparser'),
    smsforms = require('views/lib/smsforms');


exports.msbr_example_data = function (test) {
    var def = smsforms['MSBR'];
    var doc = {
        sent_timestamp: '1-13-12 15:35',
        from: '+15551212',
        message: '1!MSBR!2012#12#20#12345678901#1111#bbbbbbbbbbbbbbbbbbbb#22#10#cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
    };

    test.expect(2);

    var obj = smsparser.parse(def.fields, doc);
    var expectedObj = {
        ref_year: '2012',
        ref_month: '12',
        ref_day: 20,
        ref_rc: 12345678901,
        ref_hour: '1111',
        ref_name: 'bbbbbbbbbbbbbbbbbbbb',
        ref_age: 22,
        ref_reason: 'Diarrhée grave',
        ref_reason_other: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
    };

    //console.log(obj);
    //console.log(expectedObj);

    test.same(obj, expectedObj);

    var arr = smsparser.parseArray(def.fields, doc);
    var expectedArr = ['1-13-12 15:35', '+15551212', '2012', '12', 20, 12345678901, '1111', 'bbbbbbbbbbbbbbbbbbbb', 22, 'Diarrhée grave', 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc']

    test.same(arr, expectedArr);

    test.done();
};
