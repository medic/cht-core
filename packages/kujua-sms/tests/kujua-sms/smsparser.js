var smsparser = require('views/lib/smsparser'),
    jsonforms = require('views/lib/jsonforms');

exports.get_form = function(test) {
    test.expect(3);
    var msg, form;

    msg = 'YYYY CDT33';
    form = smsparser.getFormCode(msg);
    test.same('YYYY',form);

    // arbitrary delimiter
    msg = 'YYYY-CDT33',
    form = smsparser.getFormCode(msg);
    test.same('YYYY',form);

    // arbitrary delimiter
    msg = 'ZZZ!CDT33',
    form = smsparser.getFormCode(msg);
    test.same('ZZZ',form);

    test.done();
};

exports.parse_month_type = function(test) {
    test.expect(1);

    var doc = { message: "1!FOO!10" },
        def = {
            meta: {code: "FOO", label: 'Test Monthly Report'},
            fields: {
                month: {
                    labels: {
                         short: 'Report Month',
                         tiny: 'RPM'
                    },
                    type: 'month',
                    required: true
                }
            }
        },
        data = smsparser.parse(def, doc);

    test.same(10, data.month);
    test.done();
};

exports.validations_is_numeric_month_stays_numeric = function(test) {
    test.expect(1);

    var doc = { message: "1!YYYY!foo#2011#11#" },
        form = smsparser.getFormCode(doc.message),
        def = jsonforms.getForm(form),
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
        def = jsonforms.getForm(doc.form),
        data = smsparser.parse(def, doc);
    test.same({}, data);
    test.done();
};

exports.wrong_field_type = function(test) {
    test.expect(1);

    var doc = {
            "message":"1!YYYY!facility#2011#11#yyyyy#zzzz#2#3#4#5#6#9#8#7#6#5#4",
            "type":"sms_message",
            "form":"YYYY"},
        def = jsonforms.getForm(doc.form),
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
            "message":"1!YYYY!facility#2011#11#1#1#2#3",
            "type":"sms_message",
            "form":"YYYY"},
        def = jsonforms.getForm(doc.form),
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
            "message":"1!YYYY!facility#2011#11#0#1#2#3#1#1#1#1#1#1#1#1#1#1#####77#",
            "type":"sms_message",
            "form":"YYYY"},
        def = jsonforms.getForm(doc.form),
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

exports.textforms_bang_delimited_keyval = function(test) {
    test.expect(1);

    var doc = { message: 'YYYY#HFI!foobar#ZDT!999#RPY!!2012' },
        def = jsonforms.getForm('YYYY'),
        data = smsparser.parse(def, doc);

    test.same(data, {
        "facility_id": "foobar",
        "year": 2012,
        "quantity_dispensed": {
            "zinc": 999
        }
    });

    test.done();
};

exports.textforms_dash_delimited_keyval = function(test) {
    test.expect(1);

    var doc = { message: 'YYYY#HFI-foobar#ZDT-999#RPY--2012' },
        def = jsonforms.getForm('YYYY'),
        data = smsparser.parse(def, doc);

    test.same(data, {
        "facility_id": "foobar",
        "year": 2012,
        "quantity_dispensed": {
            "zinc": 999
        }
    });

    test.done();
};

exports.textforms_random_ordering = function(test) {
    test.expect(1);

    var doc = { message: 'YYYY CDT 33 #HFI foobar# ZDT 999 #RPY 2012' },
        def = jsonforms.getForm('YYYY'),
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

exports.textforms_without_hash_delim = function(test) {
    // hashes are required to parse textform messages so this parses the first
    // field and the rest of the message as the value. CDT is a number so parsing
    // that fails and returns null as the value.
    test.expect(1);

    var doc = { message: 'YYYY CDT 33 HFI foobar ZDT 999 RPY 2012' },
        def = jsonforms.getForm('YYYY'),
        data = smsparser.parse(def, doc);

    test.same(data, {
        "quantity_dispensed": {
            "cotrimoxazole": null
        }
    });

    test.done();
};

exports.textforms_numeric = function(test) {
    test.expect(1);

    var doc = { message: 'YYYY CDT 33# ZDT 999 #RPY2012' },
        def = jsonforms.getForm('YYYY'),
        data = smsparser.parse(def, doc);

    test.same(data, {
        quantity_dispensed: {
            cotrimoxazole: 33,
            zinc: 999
        },
        year: 2012
    });
    test.done();
};

exports.textforms_numeric_no_spaces = function(test) {
    test.expect(1);

    var doc = { message: 'YYYY CDT33#ZDT999#RPY2012' },
        def = jsonforms.getForm('YYYY'),
        data = smsparser.parse(def, doc);

    test.same(data, {
        quantity_dispensed: {
            cotrimoxazole: 33,
            zinc: 999
        },
        year: 2012
    });
    test.done();
};

exports.textforms_w_numeric_string = function(test) {
    test.expect(3);

    var doc = { message: 'YYYY CDT33#HFI001#ZDT999#RPY2012' },
        def = jsonforms.getForm('YYYY'),
        data = smsparser.parse(def, doc);

    test.same(data, {
        facility_id: '001',
        quantity_dispensed: {
            cotrimoxazole: 33,
            zinc: 999
        },
        year: 2012
    });

    doc = { message: 'YYYY CDT33#HFI01ach#ZDT999#RPY2012' },
    data = smsparser.parse(def, doc);

    test.same(data, {
        facility_id: '01ach',
        quantity_dispensed: {
            cotrimoxazole: 33,
            zinc: 999
        },
        year: 2012
    });

    doc = { message: 'YYYY CDT33#ZDT999#RPY2012' },
    data = smsparser.parse(def, doc);

    test.same(data, {
        quantity_dispensed: {
            cotrimoxazole: 33,
            zinc: 999
        },
        year: 2012
    });
    test.done();
};

exports.parse_empty_list_field = function(test) {
    test.expect(1);

    var sms = {
        message: "1!0000!1#"
    };

    var def = {
        fields: {
            "q1": {
                type: "integer",
                list: [[0, "Yes"], [1, "No"]],
                labels: {
                    short: "question 1"
                }
            },
            "q2": {
                type: "integer",
                list: [[0, "Yes"], [1, "No"]],
                labels: {
                    short: "question 2"
                }
            }
        }
    };

    var data = smsparser.parse(def, sms);
    // q2 should be null. empty string attempted to be parsed as number.
    test.same(data, {q1: "No", q2: null});
    test.done();
};

exports.parse_zero_value_list_field = function(test) {
    test.expect(1);

    var sms = {
        message: "1!0000!0"
    };

    var def = {
        fields: {
            "q1": {
                type: "integer",
                list: [[0, "Yes"], [1, "No"]],
                labels: {
                    short: "question 1"
                }
            }
        }
    };

    var data = smsparser.parse(def, sms);
    test.same(data, {q1: "Yes"});
    test.done();
};

exports.ignore_whitespace_in_list_field_textforms = function(test) {

    var def = {
        meta: {
            code: 'ABCD'
        },
        fields: {
            "q": {
                type: "integer",
                list: [[0, "Yes"], [1, "No"]],
                labels: {
                    tiny: "q"
                }
            }
        }
    };

    var tests = [
        [
            { message: "ABCD Q \t\n 1 \t\n" },
            { q: "No" }
        ],
        [
            { message: "ABCD Q \t\n 0 \t\n" },
            { q: "Yes" }
        ]
    ];

    test.expect(tests.length);

    tests.forEach(function(pair) {
        test.same(smsparser.parse(def, pair[0]), pair[1]);
    });

    test.done();
};

exports.ignore_whitespace_in_list_field_muvuku = function(test) {

    var def = {
        fields: {
            "q": {
                type: "integer",
                list: [[0, "Yes"], [1, "No"]],
                labels: {
                    short: "question 1"
                }
            }
        }
    };

    var tests = [
        [
            { message: "1!0000!\t\n 0 \t\n" },
            { q: "Yes" }
        ],
        [
            { message: "1!0000!\t\n 1 \t\n" },
            { q: "No" }
        ]
    ];

    test.expect(tests.length);

    tests.forEach(function(pair) {
        test.same(smsparser.parse(def, pair[0]), pair[1]);
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
    test.same(data, {testdate: 1331510400000});


    doc = {
        message: "0000 TDATE 2012-03-12"
    };

    data = smsparser.parse(def, doc);
    test.same(data, {testdate: 1331510400000});


    test.done();
};

exports.parse_date_field_yyyz = function(test) {
    test.expect(2);

    var doc = {
        message: "1!YYYZ!##2012-03-12"
    };

    var def = jsonforms.getForm('YYYZ');

    var data = smsparser.parse(def, doc);
    test.same(data, {one:null, two:null, birthdate: 1331510400000});

    doc = {
        message: "YYYZ BIR2012-03-12"
    };

    data = smsparser.parse(def, doc);
    test.same(data, {birthdate: 1331510400000});

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

exports.parse_string_field_mixed = function(test) {
    test.expect(2);

    // textforms
    var doc = {
        message: "0000 foo 16A"
    };
    var def = {
        fields: {
            foo: {
                type: 'string',
                labels: {
                    short: 'foo',
                    tiny: 'foo'
                }
            }
        }
    };
    var data = smsparser.parse(def, doc);
    test.same(data, {foo: "16A"});

    // muvuku
    doc = {
        message: "1!0000!16A"
    };
    data = smsparser.parse(def, doc);
    test.same(data, {foo: "16A"});

    test.done();
};

exports.parse_string_field_leading_zero = function(test) {
    test.expect(2);

    // textforms
    var doc = {
        message: "0000 foo 012345"
    };
    var def = {
        fields: {
            foo: {
                type: 'string',
                labels: {
                    short: 'foo',
                    tiny: 'foo'
                }
            }
        }
    };
    var data = smsparser.parse(def, doc);
    test.same(data, {foo: "012345"});

    // muvuku
    doc = {
        message: "1!0000!012345"
    };
    data = smsparser.parse(def, doc);
    test.same(data, {foo: "012345"});

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
            form = smsparser.getFormCode(doc.message),
            def = jsonforms.getForm(form);
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
            form = smsparser.getFormCode(doc.message),
            def = jsonforms.getForm(form);
        // assert parsing fails
        test.same({}, smsparser.parse(def, doc));
    }

    test.done();
};

exports.smsformats_textforms_only_one_field = function(test) {
    test.expect(1);

    var doc = { message: 'YYYY CDT33' },
        form = smsparser.getFormCode(doc.message),
        def = jsonforms.getForm(form),
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

    var def = jsonforms.getForm('YYYY');
    var doc = {
        sent_timestamp: '12-11-11 15:00',
        from: '+15551212',
        message: '1!YYYY!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4'
    };

    var form = smsparser.getFormCode(doc.message);
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

exports.junk_example_data = function (test) {

    var doc = {
        sent_timestamp: '2-1-12 15:35',
        from: '+13125551212',
        message: 'xox+o123'
    };

    test.expect(2);

    var form = smsparser.getFormCode(doc.message);
    var obj = smsparser.parse(null, doc);
    var expectedObj = {};
    test.same(obj, expectedObj);

    var arr = smsparser.parseArray(null, doc);
    var expectedArr = [];
    test.same(arr, expectedArr);

    test.done();
};

exports.msbb_example_data = function (test) {
    test.expect(2);

    var def = jsonforms.getForm('MSBB');
    var doc = {
        sent_timestamp: '2-1-12 15:35',
        from: '+13125551212',
        message: '1!MSBB!2012#2#1#12345678901#1111#bbbbbbbbbbbbbbbbbbbb#22#15#cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
    };

    var obj = smsparser.parse(def, doc);
    var expectedObj = {
        ref_year: 2012,
        ref_month: 2,
        ref_day: 1,
        ref_rc: '12345678901',
        ref_hour: 1111,
        ref_name: 'bbbbbbbbbbbbbbbbbbbb',
        ref_age: 22,
        ref_reason: 'Autres',
        ref_reason_other: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
    };

    test.same(obj, expectedObj);

    msbb_example_data_with_only_required_fields(test);
};

var msbb_example_data_with_only_required_fields = function (test) {
    var def = jsonforms.getForm('MSBB');
    var doc = {
        sent_timestamp: '2-1-12 15:35',
        from: '+13125551212',
        message: '1!MSBB!2012#1#24###bbbbbb'
    };

    var obj = smsparser.parse(def, doc);
    var expectedObj = {
        ref_year: '2012',
        ref_month: '1',
        ref_day: 24,
        ref_rc: null,
        ref_hour: null,
        ref_name: 'bbbbbb',
        ref_age: undefined,
        ref_reason: undefined,
        ref_reason_other: undefined
    };

    test.same(obj, expectedObj);
    
    test.done();
};


exports.msbc_example_data = function (test) {
    var def = jsonforms.getForm('MSBC');
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
        cref_rc: "12345678901",
        cref_ptype: 'Autre',
        cref_name: 'abcdefghijklmnopqrst',
        cref_age: 31,
        cref_mom: 'bcdefghijklmnopqrstu',
        cref_treated: 'cdefghijklmnopqrstuv',
        cref_rec: 'Guéri',
        cref_reason: 'defghijklmnopqrstuvw',
        cref_agent: 'efghijklmnopqrstuvwxyzabcdefghijklm'
    };


    test.same(obj, expectedObj);

    var arr = smsparser.parseArray(def, doc);
    var expectedArr = ["1-13-12 15:35","+15551212","2012","1","16","12345678901","5","abcdefghijklmnopqrst","31","bcdefghijklmnopqrstu","cdefghijklmnopqrstuv","5","defghijklmnopqrstuvw","efghijklmnopqrstuvwxyzabcdefghijklm"]

    test.same(arr, expectedArr);

    test.done();
};


exports.msbg_example_data = function (test) {
    var def = jsonforms.getForm('MSBG');
    var doc = {
        sent_timestamp: '1-16-12 15:35',
        from: '+15551212',
        message: '1!MSBG!2012#1#12345678901#123#456#789#123#456#789#123#456#789'
    };

    test.expect(2);

    var obj = smsparser.parse(def, doc);
    var expectedObj = {
        case_year: '2012',
        case_month: '1',
        monthly_rc: "12345678901",
        monthly_cta1: 123,
        monthly_cta2: 456,
        monthly_cta3: 789,
        monthly_sro1: 123,
        monthly_sro2: 456,
        monthly_sro3: 789,
        monthly_ctm1: 123,
        monthly_ctm2: 456,
        monthly_ctm3: 789
    };

    test.same(obj, expectedObj);

    var arr = smsparser.parseArray(def, doc);
    var expectedArr = ['1-16-12 15:35', '+15551212', '2012', '1', 12345678901, 123, 456, 789, 123, 456, 789, 123, 456, 789];

    test.same(arr, expectedArr);

    test.done();
};


exports.msbm_example_data = function (test) {
    var def = jsonforms.getForm('MSBM');
    var doc = {
        sent_timestamp: '1-16-12 19:35',
        from: '+15551212',
        message: '1!MSBM!2012#1#16#12345678901#123#456#789#123#456#789#123#456#123#456'
    };

    test.expect(2);

    var obj = smsparser.parse(def, doc);
    var expectedObj = {
        med_year: '2012',
        med_month: '1',
        med_day: 16,
        med_rc: 12345678901,
        med_cta_a: 123,
        med_cta_c: 456,
        med_tdr_a: 789,
        med_tdr_c: 123,
        med_ctm_a: 456,
        med_ctm_c: 789,
        med_sro_a: 123,
        med_sro_c: 456,
        med_para_a: 123,
        med_para_c: 456 
    };

    //console.log(obj);
    //console.log(expectedObj);

    test.same(obj, expectedObj);

    var arr = smsparser.parseArray(def, doc);
    var expectedArr = ['1-16-12 19:35', '+15551212', '2012', '1', 16, 12345678901, 123, 456, 789, 123, 456, 789, 123, 456, 123, 456];

    test.same(arr, expectedArr);

    test.done();
};


exports.msbp_example_data = function (test) {
    var def = jsonforms.getForm('MSBP');
    var doc = {
        sent_timestamp: '1-16-12 19:35',
        from: '+15551212',
        message: '1!MSBP!2012#1#16#12345678901#123#456#789#123#456#789#123#456#789#123#456#789#123#456#789#123'
    };

    test.expect(2);

    var obj = smsparser.parse(def, doc);
    var expectedObj = {
        case_year: '2012',
        case_month: '1',
        case_day: 16,
        case_rc: 12345678901,
        case_pec_m: 123,
        case_pec_f: 456,
        case_urg_m: 789,
        case_urg_f: 123,
        case_tdr: 456,
        case_palu_m: 789,
        case_palu_f: 123,
        case_dia_m: 456,
        case_dia_f: 789,
        case_pneu_m: 123,
        case_pneu_f: 456,
        case_mal_m: 789,
        case_mal_f: 123,
        case_rev: 456,
        case_vad: 789,
        case_edu: 123
    };

    //console.log(obj);
    //console.log(expectedObj);

    test.same(obj, expectedObj);

    var arr = smsparser.parseArray(def, doc);
    var expectedArr = ['1-16-12 19:35', '+15551212', '2012', '1', 16, 12345678901, 123, 456, 789, 123, 456, 789, 123, 456, 789, 123, 456, 789, 123, 456, 789, 123];

    test.same(arr, expectedArr);

    test.done();
};

exports.msbr_example_data = function (test) {
    var def = jsonforms.getForm('MSBR');
    var doc = {
        sent_timestamp: '1-13-12 15:35',
        from: '+15551212',
        message: '1!MSBR!2012#12#20#12345678901#1111#bbbbbbbbbbbbbbbbbbbb#22#10#cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
    };

    test.expect(2);

    var obj = smsparser.parse(def, doc);
    var expectedObj = {
        ref_year: '2012',
        ref_month: '12',
        ref_day: 20,
        ref_rc: 12345678901,
        ref_hour: '1111',
        ref_name: 'bbbbbbbbbbbbbbbbbbbb',
        ref_age: 22,
        ref_reason: 'Diarrhée grave',
        ref_reason_other: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
    };

    //console.log(obj);
    //console.log(expectedObj);

    test.same(obj, expectedObj);

    var arr = smsparser.parseArray(def, doc);
    var expectedArr = ['1-13-12 15:35', '+15551212', '2012', '12', '20', '12345678901', '1111', 'bbbbbbbbbbbbbbbbbbbb', '22', '10', 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc']

    test.same(arr, expectedArr);

    test.done();
};
