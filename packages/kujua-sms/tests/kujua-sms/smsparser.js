var smsparser = require('views/lib/smsparser'),
    jsonforms = require('views/lib/jsonforms');

exports.validations_is_numeric_month_stays_numeric = function(test) {
    test.expect(1);

    var doc = { message: "1!TEST!foo#2011#11#" },
        form = smsparser.getForm(doc.message),
        def = jsonforms[form],
        data = smsparser.parse(def, doc);

    test.same(11, data.month);

    test.done();
};

exports.form_not_found = function(test) {
    test.expect(1);
    var doc = {
            "message":"1!X0X0!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4",
            "type":"sms_message",
            "form":"X0X0"},
        def = jsonforms[doc.form],
        data = smsparser.parse(def, doc);
    test.same({}, data);
    test.done();
};

exports.wrong_field_type = function(test) {
    test.expect(1);

    var doc = {
            "message":"1!TEST!facility#2011#11#yyyyy#zzzz#2#3#4#5#6#9#8#7#6#5#4",
            "type":"sms_message",
            "form":"TEST"},
        def = jsonforms[doc.form],
        data = smsparser.parse(def, doc);

    test.same(data, {
        "facility_id": "facility",
        "year": "2011",
        "month": "11",
        "misoprostol_administered": null,
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
            "message":"1!TEST!facility#2011#11#1#1#2#3",
            "type":"sms_message",
            "form":"TEST"},
        def = jsonforms[doc.form],
        data = smsparser.parse(def, doc);

    test.same(data, {
        "facility_id": "facility",
        "year": "2011",
        "month": "11",
        "misoprostol_administered": true,
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
            "message":"1!TEST!facility#2011#11#0#1#2#3#1#1#1#1#1#1#1#1#1#1#####77#",
            "type":"sms_message",
            "form":"TEST"},
        def = jsonforms[doc.form],
        data = smsparser.parse(def, doc);

    test.same(data, {
        "facility_id": "facility",
        "year": 2011,
        "month": 11,
        "misoprostol_administered": false,
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
        "_extra_fields": true
    });

    test.done();
};

exports.textforms_random_ordering = function(test) {
    test.expect(1);

    var doc = { message: 'TEST CDT 33 #HFI foobar# ZDT 999 #RPY 2012' },
        def = jsonforms['TEST'],
        data = smsparser.parse(def, doc);

    test.same(data, {
        "facility_id": "foobar",
        "year": 2012,
        "quantity_dispensed": {
            "cotrimoxazole": 33,
            "zinc": 999,
        }
    });

    test.done();
};

// hashes are required to parse textform messages so this parses the first
// field and the rest of the message as the value. CDT is a number so parsing
// that fails and returns null as the value.
exports.textforms_without_hash_delim = function(test) {
    test.expect(1);

    var doc = { message: 'TEST CDT 33 HFI foobar ZDT 999 RPY 2012' },
        def = jsonforms['TEST'],
        data = smsparser.parse(def, doc);

    test.same(data, {
        "quantity_dispensed": {
            "cotrimoxazole": null
        }
    });

    test.done();
};

exports.parse_date_field = function(test) {
    test.expect(2);

    var doc = {
        message: "1!0000!2012-03-12"
    };

    var def = {
        fields: {
            testdate: {
                type: 'date',
                labels: {
                    short: 'testdate',
                    tiny: 'TDATE'
                }
            }
        }
    };

    var data = smsparser.parse(def, doc);
    test.same(data, {testdate: 1331528400000});

    doc = {
        message: "0000 TDATE 2012-03-12"
    };

    data = smsparser.parse(def, doc);
    test.same(data, {testdate: 1331528400000});

    test.done();
};

exports.parse_boolean_field = function(test) {
    test.expect(2);
    var doc = {
        message: "1!0000!1"
    };
    var def = {
        fields: {
            testbool: {
                type: 'boolean',
                labels: 'testbool'
            }
        }
    };
    var data = smsparser.parse(def, doc);
    test.same(data, {testbool: true});

    doc = {
        message: "1!0000!0"
    };
    data = smsparser.parse(def, doc);
    test.same(data, {testbool: false});

    test.done();
};

exports.smsformats_unstructured = function(test) {
    test.expect(3);

    var docs = [
        { message: "testing one two three." },
        { message: "HELP ME" },
        { message: ""} // blank message
    ];

    for (var i in docs) {
        var doc = docs[i],
            form = smsparser.getForm(doc.message),
            def = jsonforms[form];
        // assert parsing fails
        test.same({}, smsparser.parse(def, doc));
    }

    test.done();
};

exports.smsformats_structured_but_no_form = function(test) {
    test.expect(2);

    var docs = [
        {message: "1!0000!1"},
        {message: "0000 ABC 123-123-123"}
    ];

    for (var i in docs) {
        var doc = docs[i],
            form = smsparser.getForm(doc.message),
            def = jsonforms[form];
        // assert parsing fails
        test.same({}, smsparser.parse(def, doc));
    }

    test.done();
};

exports.smsformats_textforms_only_one_field = function(test) {
    test.expect(1);

    var doc = { message: 'TEST CDT33' },
        form = smsparser.getForm(doc.message),
        def = jsonforms[form],
        data = smsparser.parse(def, doc),
        expect = {
          "quantity_dispensed": {
            "cotrimoxazole": 33,
          }
        };

    test.same(expect, data);

    test.done();
};

exports.valid_message = function (test) {

    var def = jsonforms['TEST'];
    var doc = {
        sent_timestamp: '12-11-11 15:00',
        from: '+15551212',
        message: '1!TEST!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4'
    };

    var form = smsparser.getForm(doc.message);
    var obj = smsparser.parse(def, doc);

    test.same(obj, {
        facility_id: 'facility',
        year: '2011',
        month: '11',
        misoprostol_administered: false,
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

    var arr = smsparser.parseArray(def, doc);
    test.same(
        arr,
        ['12-11-11 15:00', '+15551212', 'facility', '2011', '11', false, 1, 2, 3, 4, 5, 6, 9, 8, 7, 6, 5, 4]
    );

    test.done();
};
