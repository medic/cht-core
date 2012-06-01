var smsparser = require('views/lib/smsparser'),
    smsforms = require('views/lib/smsforms');

exports.cnpw_example_data = function (test) {

    var doc = {
        sent_timestamp: '2-1-12 15:35',
        from: '+13125551212',
        message: 'CNPW WKN2# WKS 3# AFP 99# NNT 0# MSL 5# AES01'
    };

    test.expect(2);

    var form = smsparser.getForm(doc.message);
    var obj = smsparser.parse(form, null, doc);
    var expectedObj = {
        wkn: 2,
        wks: 3,
        afp: 99,
        nnt: 0,
        msl: 5,
        aes: 1
    };

    test.same(obj, expectedObj);

    var arr = smsparser.parseArray('CNPW', null, doc);
    var expectedArr = ['2-1-12 15:35', '+13125551212', 2, 3, 99, 0, 5, 1]

    test.same(arr, expectedArr);

    test.done();
};
