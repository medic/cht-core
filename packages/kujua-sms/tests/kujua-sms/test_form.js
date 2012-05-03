var smsparser = require('views/lib/smsparser'),
    smsforms = require('views/lib/smsforms');

exports.test_example_data = function (test) {

    var def = smsforms['TEST'];
    var doc = {
        sent_timestamp: '2-1-12 15:35',
        from: '+13125551212',
        message: '1!TEST!a#2'
    };

    test.expect(2);

    var form = smsparser.getForm(doc.message);
    var obj = smsparser.parse(form, def, doc);
    var expectedObj = {
        foo: "a",
        bar: 2
    };

    test.same(obj, expectedObj);

    var arr = smsparser.parseArray('TEST', def, doc);
    var expectedArr = ['2-1-12 15:35', '+13125551212', "a", 2]

    test.same(arr, expectedArr);

    test.done();
};
