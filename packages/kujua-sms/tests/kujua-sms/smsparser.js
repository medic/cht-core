var smsparser = require('views/lib/smsparser'),
    smsforms = require('views/lib/smsforms');


exports.valid_message = function(test) {
    test.expect(1);
    var doc = {
            "message":"1!PSMS!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4",
            "type":"sms_message",
            "form":"PSMS"},
        def = smsforms[doc.form],
        data = smsparser.parse(def, doc),
        expect = {
            "facility_id":"facility",
            "year":"2011",
            "month":"11",
            "la_6x1_dispensed":1,
            "la_6x2_dispensed":2,
            "cotrimoxazole_dispensed":3,
            "zinc_dispensed":4,
            "ors_dispensed":5,
            "eye_ointment_dispensed":6,
            "la_6x1_days_stocked_out":9,
            "la_6x2_days_stocked_out":8,
            "cotrimoxazole_days_stocked_out":7,
            "zinc_days_stocked_out":6,
            "ors_days_stocked_out":5,
            "eye_ointment_days_stocked_out":4};
    test.same(expect, data);
    test.done();
};

exports.blank_message = function(test) {
    test.expect(1);
    var doc = {
            "message":"",
            "type":"sms_message",
            "form":""},
        def = smsforms[doc.form],
        data = smsparser.parse(def, doc);
    test.same({}, data);
    test.done();
};

exports.form_not_found = function(test) {
    test.expect(1);
    var doc = {
            "message":"1!X0X0!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4",
            "type":"sms_message",
            "form":"X0X0"},
        def = smsforms[doc.form],
        data = smsparser.parse(def, doc);
    test.same({}, data);
    test.done();
};

exports.wrong_field_type = function(test) {
    test.expect(1);
    var doc = {
            "message":"1!PSMS!facility#2011#11#zzzz#2#3#4#5#6#9#8#7#6#5#4",
            "type":"sms_message",
            "form":"PSMS"},
        def = smsforms[doc.form],
        data = smsparser.parse(def, doc),
        expect = {
            "facility_id":"facility",
            "year":"2011",
            "month":"11",
            "la_6x1_dispensed":null,
            "la_6x2_dispensed":2,
            "cotrimoxazole_dispensed":3,
            "zinc_dispensed":4,
            "ors_dispensed":5,
            "eye_ointment_dispensed":6,
            "la_6x1_days_stocked_out":9,
            "la_6x2_days_stocked_out":8,
            "cotrimoxazole_days_stocked_out":7,
            "zinc_days_stocked_out":6,
            "ors_days_stocked_out":5,
            "eye_ointment_days_stocked_out":4};
    test.same(expect, data);
    test.done();
};

exports.missing_fields = function(test) {
    test.expect(1);
    var doc = {
            "message":"1!PSMS!facility#2011#11#1#2#3",
            "type":"sms_message",
            "form":"PSMS"},
        def = smsforms[doc.form],
        data = smsparser.parse(def, doc),
        expect = {
            "facility_id":"facility",
            "year":"2011",
            "month":"11",
            "la_6x1_dispensed":1,
            "la_6x2_dispensed":2,
            "cotrimoxazole_dispensed":3,
            "zinc_dispensed":null,
            "ors_dispensed":null,
            "eye_ointment_dispensed":null,
            "la_6x1_days_stocked_out":null,
            "la_6x2_days_stocked_out":null,
            "cotrimoxazole_days_stocked_out":null,
            "zinc_days_stocked_out":null,
            "ors_days_stocked_out":null,
            "eye_ointment_days_stocked_out":null};
    test.same(expect, data);
    test.done();
};
