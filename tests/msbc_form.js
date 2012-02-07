var smsparser = require('kujua-sms-import/smsparser'),
    smsforms = require('kujua-sms-import/smsforms');


exports.msbc_example_data = function (test) {
    var def = smsforms['MSBC'];
    var doc = {
        sent_timestamp: '1-13-12 15:35',
        from: '+15551212',
        message: '1!MSBC!2012#1#16#12345678901#5#abcdefghijklmnopqrst#31#bcdefghijklmnopqrstu#cdefghijklmnopqrstuv#5#defghijklmnopqrstuvw#efghijklmnopqrstuvwxyzabcdefghijklm'
    };

    test.expect(2);

    var obj = smsparser.parse(def, doc);
    var expectedObj = {
        cref_year: '2012',
        cref_month: '1',
        cref_day: 16,
        cref_rc: 12345678901,
        cref_ptype: 'Autre',
        cref_name: 'abcdefghijklmnopqrst',
        cref_age: 31,
        cref_mom: 'bcdefghijklmnopqrstu',
        cref_treated: 'cdefghijklmnopqrstuv',
        cref_rec: 'Référé',
        cref_reason: 'defghijklmnopqrstuvw',
        cref_agent: 'efghijklmnopqrstuvwxyzabcdefghijklm'
    };

    //console.log(obj);
    //console.log(expectedObj);

    test.same(obj, expectedObj);

    var arr = smsparser.parseArray(def, doc);
    var expectedArr = ['1-13-12 15:35', '+15551212', '2012', '1', 16, 12345678901, 'Autre', 'abcdefghijklmnopqrst', 31, 'bcdefghijklmnopqrstu', 'cdefghijklmnopqrstuv','Référé','defghijklmnopqrstuvw','efghijklmnopqrstuvwxyzabcdefghijklm'];

    test.same(arr, expectedArr);

    test.done();
};
