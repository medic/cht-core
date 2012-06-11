var smsparser = require('views/lib/smsparser'),
    jsonforms = require('views/lib/jsonforms');


exports.msbp_example_data = function (test) {
    var def = jsonforms['MSBP'];
    var doc = {
        sent_timestamp: '1-16-12 19:35',
        from: '+15551212',
        message: '1!MSBP!2012#1#16#12345678901#123#456#789#123#456#789#123#456#789#123#456#789#123#456#789#123'
    };

    test.expect(2);

    var obj = smsparser.parse('MSBP', def, doc);
    var expectedObj = {
        case_year: '2012',
        case_month: '1',
        case_day: 16,
        case_rc: 12345678901,
        case_pec_m: 123,
        case_pec_f: 456,
        case_urg_m: 789,
        case_urg_f: 123,
        case_tdr: 456,
        case_palu_m: 789,
        case_palu_f: 123,
        case_dia_m: 456,
        case_dia_f: 789,
        case_pneu_m: 123,
        case_pneu_f: 456,
        case_mal_m: 789,
        case_mal_f: 123,
        case_rev: 456,
        case_vad: 789,
        case_edu: 123
    };

    //console.log(obj);
    //console.log(expectedObj);

    test.same(obj, expectedObj);

    var arr = smsparser.parseArray('MSBP', def, doc);
    var expectedArr = ['1-16-12 19:35', '+15551212', '2012', '1', 16, 12345678901, 123, 456, 789, 123, 456, 789, 123, 456, 789, 123, 456, 789, 123, 456, 789, 123];

    test.same(arr, expectedArr);

    test.done();
};
