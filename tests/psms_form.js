var smsparser = require('views/lib/smsparser'),
    smsforms = require('views/lib/smsforms');


exports.psms_example_data = function (test) {
    var def = smsforms['PSMS'];
    var msg = 'PSMS#facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4';

    var obj = smsparser.parse(def, msg);
    test.same(obj, {
        facility_id: 'facility',
        year: '2011',
        month: '11',
        la_6x1_dispensed: 1,
        la_6x2_dispensed: 2,
        cotrimoxazole_dispensed: 3,
        zinc_dispensed: 4,
        ors_dispensed: 5,
        eye_ointment_dispensed: 6,
        la_6x1_days_stocked_out: 9,
        la_6x2_days_stocked_out: 8,
        cotrimoxazole_days_stocked_out: 7,
        zinc_days_stocked_out: 6,
        ors_days_stocked_out: 5,
        eye_ointment_days_stocked_out: 4
    });

    var arr = smsparser.parseArray(def, msg);
    test.same(
        arr,
        ['facility', '2011', '11', 1, 2, 3, 4, 5, 6, 9, 8, 7, 6, 5, 4]
    );

    test.done();
};
