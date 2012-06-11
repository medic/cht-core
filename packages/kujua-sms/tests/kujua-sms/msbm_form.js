var smsparser = require('views/lib/smsparser'),
    jsonforms = require('views/lib/jsonforms');


exports.msbm_example_data = function (test) {
    var def = jsonforms['MSBM'];
    var doc = {
        sent_timestamp: '1-16-12 19:35',
        from: '+15551212',
        message: '1!MSBM!2012#1#16#12345678901#123#456#789#123#456#789#123#456#123#456'
    };

    test.expect(2);

    var obj = smsparser.parse('MSBM', def, doc);
    var expectedObj = {
        med_year: '2012',
        med_month: '1',
        med_day: 16,
        med_rc: 12345678901,
        med_cta_a: 123,
        med_cta_c: 456,
        med_tdr_a: 789,
        med_tdr_c: 123,
        med_ctm_a: 456,
        med_ctm_c: 789,
        med_sro_a: 123,
        med_sro_c: 456,
        med_para_a: 123,
        med_para_c: 456 
    };

    //console.log(obj);
    //console.log(expectedObj);

    test.same(obj, expectedObj);

    var arr = smsparser.parseArray('MSBM', def, doc);
    var expectedArr = ['1-16-12 19:35', '+15551212', '2012', '1', 16, 12345678901, 123, 456, 789, 123, 456, 789, 123, 456, 123, 456];

    test.same(arr, expectedArr);

    test.done();
};
