var smsparser = require('views/lib/smsparser'),
    jsonforms = require('views/lib/jsonforms');


exports.valid_message = function(test) {
    test.expect(1);

    var doc = {
            "message":"1!TEST!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4",
            "type":"sms_message",
            "form":"TEST"},
        def = jsonforms[doc.form],
        data = smsparser.parse('TEST', def, doc);

    test.same(data, {
        "facility_id": "facility",
        "year": "2011",
        "month": "11",
        "quantity_dispensed": {
            "la_6x1": 1,
            "la_6x2": 2,
            "cotrimoxazole": 3,
            "zinc": 4,
            "ors": 5,
            "eye_ointment": 6
        },
        "days_stocked_out": {
            "la_6x1": 9,
            "la_6x2": 8,
            "cotrimoxazole": 7,
            "zinc": 6,
            "ors": 5,
            "eye_ointment": 4
        }
    });

    test.done();
};

exports.blank_message = function(test) {
    test.expect(1);
    var doc = {
            "message":"",
            "type":"sms_message",
            "form":""},
        def = jsonforms[doc.form],
        data = smsparser.parse("", def, doc);
    test.same({}, data);
    test.done();
};

exports.form_not_found = function(test) {
    test.expect(1);
    var doc = {
            "message":"1!X0X0!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4",
            "type":"sms_message",
            "form":"X0X0"},
        def = jsonforms[doc.form],
        data = smsparser.parse('X0X0', def, doc);
    test.same({}, data);
    test.done();
};

exports.wrong_field_type = function(test) {
    test.expect(1);
    
    var doc = {
            "message":"1!TEST!facility#2011#11#zzzz#2#3#4#5#6#9#8#7#6#5#4",
            "type":"sms_message",
            "form":"TEST"},
        def = jsonforms[doc.form],
        data = smsparser.parse('TEST', def, doc);
    
    test.same(data, {
        "facility_id": "facility",
        "year": "2011",
        "month": "11",
        "quantity_dispensed": {
            "la_6x1": null,
            "la_6x2": 2,
            "cotrimoxazole": 3,
            "zinc": 4,
            "ors": 5,
            "eye_ointment": 6,
        },
        "days_stocked_out": {
            "la_6x1": 9,
            "la_6x2": 8,
            "cotrimoxazole": 7,
            "zinc": 6,
            "ors": 5,
            "eye_ointment": 4
        }
    });
    
    test.done();
};

exports.missing_fields = function(test) {
    test.expect(1);
    
    var doc = {
            "message":"1!TEST!facility#2011#11#1#2#3",
            "type":"sms_message",
            "form":"TEST"},
        def = jsonforms[doc.form],
        data = smsparser.parse('TEST', def, doc);

    test.same(data, {
        "facility_id": "facility",
        "year": "2011",
        "month": "11",
        "quantity_dispensed": {
            "la_6x1": 1,
            "la_6x2": 2,
            "cotrimoxazole": 3,
            "zinc": undefined,
            "ors": undefined,
            "eye_ointment": undefined,
        },
        "days_stocked_out": {
            "la_6x1": undefined,
            "la_6x2": undefined,
            "cotrimoxazole": undefined,
            "zinc": undefined,
            "ors": undefined,
            "eye_ointment": undefined
        }
    });
    
    test.done();
};

exports.extra_fields = function(test) {
    test.expect(1);
    
    var doc = {
            "message":"1!TEST!facility#2011#11#1#2#3#1#1#1#1#1#1#1#1#1#1#####77#",
            "type":"sms_message",
            "form":"TEST"},
        def = jsonforms[doc.form],
        data = smsparser.parse('TEST', def, doc);

    test.same(data, {
        "facility_id": "facility",
        "year": "2011",
        "month": "11",
        "quantity_dispensed": {
            "la_6x1": 1,
            "la_6x2": 2,
            "cotrimoxazole": 3,
            "zinc": 1,
            "ors": 1,
            "eye_ointment": 1,
        },
        "days_stocked_out": {
            "la_6x1": 1,
            "la_6x2": 1,
            "cotrimoxazole": 1,
            "zinc": 1,
            "ors": 1,
            "eye_ointment": 1
        },
        "extra_fields": true
    });
    
    test.done();
};
