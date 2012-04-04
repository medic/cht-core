var smsparser = require('views/lib/smsparser'),
    smsforms = require('views/lib/smsforms');

exports.junk_example_data = function (test) {

    var doc = {
        sent_timestamp: '2-1-12 15:35',
        from: '+13125551212',
        message: 'xox+o123'
    };

    test.expect(2);

    var form = smsparser.getForm(doc.message);
    var obj = smsparser.parse(form, null, doc);
    var expectedObj = {};
    test.same(obj, expectedObj);

    var arr = smsparser.parseArray(form, null, doc);
    var expectedArr = [];
    test.same(arr, expectedArr);

    test.done();
};
