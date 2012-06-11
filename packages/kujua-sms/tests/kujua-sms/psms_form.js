var smsparser = require('views/lib/smsparser'),
    jsonforms = require('views/lib/jsonforms');


exports.psms_example_data = function (test) {
    var def = jsonforms['TEST'];
    var doc = {
        sent_timestamp: '12-11-11 15:00',
        from: '+15551212',
        message: '1!TEST!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4'
    };

    var form = smsparser.getForm(doc.message);
    var obj = smsparser.parse(form, def, doc);

    test.same(obj, {
        facility_id: 'facility',
        year: '2011',
        month: '11',
        quantity_dispensed: {
            la_6x1: 1,
            la_6x2: 2,
            cotrimoxazole: 3,
            zinc: 4,
            ors: 5,
            eye_ointment: 6
        },
        days_stocked_out: {
            la_6x1: 9,
            la_6x2: 8,
            cotrimoxazole: 7,
            zinc: 6,
            ors: 5,
            eye_ointment: 4
        }
    });

    var arr = smsparser.parseArray('TEST', def, doc);
    test.same(
        arr,
        ['12-11-11 15:00', '+15551212', 'facility', '2011', '11', 1, 2, 3, 4, 5, 6, 9, 8, 7, 6, 5, 4]
    );

    test.done();
};
