var smsparser = require('views/lib/smsparser'),
    jsonforms = require('views/lib/jsonforms');

exports.cnpw_example_data = function (test) {

    var doc = {
        sent_timestamp: '2-1-12 15:35',
        from: '+13125551212',
        message: 'CNPW WKN2# WKS 3# AFP 99# NNT 0# MSL 5# AES01'
    };

    test.expect(2);

    var form = smsparser.getForm(doc.message);
    var obj = smsparser.parse(form, jsonforms['CNPW'], doc);
    var expectedObj = {
        week_number: 2,
        weeks_duration: 3,
        afp_cases: 99,
        nnt_cases: 0,
        msl_cases: 5,
        aes_cases: 1
    };

    test.same(obj, expectedObj);

    var arr = smsparser.parseArray('CNPW', null, doc);
    var expectedArr = ['2-1-12 15:35', '+13125551212', 2, 3, 99, 0, 5, 1]

    test.same(arr, expectedArr);

    test.done();
};
