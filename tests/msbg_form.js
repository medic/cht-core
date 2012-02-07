var smsparser = require('kujua-sms-import/smsparser'),
    smsforms = require('kujua-sms-import/smsforms');


exports.msbg_example_data = function (test) {
    var def = smsforms['MSBG'];
    var doc = {
        sent_timestamp: '1-16-12 15:35',
        from: '+15551212',
        message: '1!MSBG!2012#1#12345678901#123#456#789#123#456#789#123#456#789'
    };

    test.expect(2);

    var obj = smsparser.parse(def, doc);
    var expectedObj = {
        monthly_year: '2012',
        monthly_month: '1',
        monthly_rc: 12345678901,
        monthly_cta1: 123,
        monthly_cta2: 456,
        monthly_cta3: 789,
        monthly_sro1: 123,
        monthly_sro2: 456,
        monthly_sro3: 789,
        monthly_ctm1: 123,
        monthly_ctm2: 456,
        monthly_ctm3: 789
    };

    //console.log(obj);
    //console.log(expectedObj);

    test.same(obj, expectedObj);

    var arr = smsparser.parseArray(def, doc);
    var expectedArr = ['1-16-12 15:35', '+15551212', '2012', '1', 12345678901, 123, 456, 789, 123, 456, 789, 123, 456, 789];

    test.same(arr, expectedArr);

    test.done();
};
