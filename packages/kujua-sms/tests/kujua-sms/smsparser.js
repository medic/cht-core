var utils = require('kujua-sms/utils'),
    smsparser = require('views/lib/smsparser');

exports.setUp = function (callback) {
    utils.info = require('views/lib/appinfo').getAppInfo.call(this);
    callback();
};

exports['is muvuku format'] = function(test) {
    var msgs = [
        '1!ANCR!sarah',
        '1!ANCR!sarah#11',
        '1!ग!sarah#11'
    ];
    msgs.forEach(function(msg) {
        test.ok(smsparser.isMuvukuFormat(msg));
    });
    test.done();
};

exports['get form none found'] = function(test) {
    var msg = '';
    var form = smsparser.getFormCode(msg);
    test.same(undefined, form);
    test.done();
};

exports['get form with space delimiter'] = function(test) {
    var msg = 'YYYY CDT33';
    var form = smsparser.getFormCode(msg);
    test.same('YYYY', form);
    test.done();
};

exports['get form with no content'] = function(test) {
    var msg = 'YYYY';
    var form = smsparser.getFormCode(msg);
    test.same('YYYY', form);
    test.done();
};

exports['get form is case insensitive'] = function(test) {
    var msg = 'yyyy CDT33';
    var form = smsparser.getFormCode(msg);
    test.same('YYYY', form);
    test.done();
};

exports['get form with hyphen delimiter'] = function(test) {
    var msg = 'YYYY-CDT33';
    var form = smsparser.getFormCode(msg);
    test.same('YYYY', form);
    test.done();
};

exports['get form with multiple words'] = function(test) {
    var msg = 'YYYY CDT33 foo bar';
    var form = smsparser.getFormCode(msg);
    test.same('YYYY', form);
    test.done();
};

exports['get form with exlamation mark delimiter'] = function(test) {
    var msg = 'YYYY!foo#2011#11#';
    var form = smsparser.getFormCode(msg);
    test.same('YYYY', form);
    test.done();
};

exports['get form with non ascii name'] = function(test) {
    var msg = 'द CDT33';
    var form = smsparser.getFormCode(msg);
    test.same('द', form);
    test.done();
};

exports['parse month type'] = function(test) {
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

exports['validations is numeric month stays numeric'] = function(test) {
    test.expect(1);

    var doc = { message: "1!YYYY!foo#2011#11#" },
        form = smsparser.getFormCode(doc.message),
        def = utils.info.getForm(form),
        data = smsparser.parse(def, doc);

    test.same(11, data.month);

    test.done();
};

exports['form not found'] = function(test) {
    test.expect(1);
    var doc = {
            "message":"1!X0X0!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4",
            "type":"sms_message",
            "form":"X0X0"},
        def = utils.info.getForm(doc.form),
        data = smsparser.parse(def, doc);
    test.same({}, data);
    test.done();
};

exports['wrong field type'] = function(test) {
    test.expect(1);

    var doc = {
            "message":"1!YYYY!facility#2011#11#yyyyy#zzzz#2#3#4#5#6#9#8#7#6#5#4",
            "type":"sms_message",
            "form":"YYYY"},
        def = utils.info.getForm(doc.form),
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

exports['missing fields'] = function(test) {
    test.expect(1);

    var doc = {
            "message":"1!YYYY!facility#2011#11#1#1#2#3",
            "type":"sms_message",
            "form":"YYYY"},
        def = utils.info.getForm(doc.form),
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

exports['extra fields'] = function(test) {
    test.expect(1);

    var doc = {
            "message":"1!YYYY!facility#2011#11#0#1#2#3#1#1#1#1#1#1#1#1#1#1#####77#",
            "type":"sms_message",
            "form":"YYYY"},
        def = utils.info.getForm(doc.form),
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

exports['textforms bang delimited keyval'] = function(test) {
    test.expect(1);

    var doc = { message: 'YYYY#HFI!foobar#ZDT!999#RPY!!2012' },
        def = utils.info.getForm('YYYY'),
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

exports['textforms dash delimited keyval'] = function(test) {
    test.expect(1);

    var doc = { message: 'YYYY#HFI-foobar#ZDT-999#RPY--2012' },
        def = utils.info.getForm('YYYY'),
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

exports['textforms random ordering'] = function(test) {
    test.expect(1);

    var doc = { message: 'YYYY CDT 33 #HFI foobar# ZDT 999 #RPY 2012' },
        def = utils.info.getForm('YYYY'),
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

exports['textforms without hash delim'] = function(test) {
    // hashes are required to parse textform messages so this parses the first
    // field and the rest of the message as the value. CDT is a number so parsing
    // that fails and returns null as the value.
    test.expect(1);

    var doc = { message: 'YYYY CDT 33 HFI foobar ZDT 999 RPY 2012' },
        def = utils.info.getForm('YYYY'),
        data = smsparser.parse(def, doc);

    test.same(data, {
        "quantity_dispensed": {
            "cotrimoxazole": null
        }
    });

    test.done();
};

exports['textforms numeric'] = function(test) {
    test.expect(1);

    var doc = { message: 'YYYY CDT 33# ZDT 999 #RPY2012' },
        def = utils.info.getForm('YYYY'),
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

exports['textforms numeric no spaces'] = function(test) {
    test.expect(1);

    var doc = { message: 'YYYY CDT33#ZDT999#RPY2012' },
        def = utils.info.getForm('YYYY'),
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

exports['textforms w numeric string'] = function(test) {
    test.expect(3);

    var doc = { message: 'YYYY CDT33#HFI001#ZDT999#RPY2012' },
        def = utils.info.getForm('YYYY'),
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

exports['parse empty list field'] = function(test) {
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

exports['parse zero value list field'] = function(test) {
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

exports['ignore whitespace in list field textforms'] = function(test) {

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
            },
            "name": {
                type: "string",
                labels: {
                    tiny: "name"
                }
            }
        }
    };

    var tests = [
        [
            { message: "\t\nABCD \t \n \t Q \t\n 1 \t\n" },
            { q: "No" }
        ],
        [
            { message: "\t\nABCD \t\n Q \t\n 0 \t\n" },
            { q: "Yes" }
        ],
        [
            { message: "\t\n ABCD\t\n  Q \t\n 0 \t\n# \t\n Name John Smith\n \t" },
            { q: "Yes", name: "John Smith" }
        ],
        [
            { message: "\t\nABCD\t \n Q \t\n 1 \t \n# \t\n Name  \t \n John Smith\n \t" },
            { q: "No", name: "John Smith" }
        ]
    ];

    test.expect(tests.length);

    tests.forEach(function(pair) {
        test.same(smsparser.parse(def, pair[0]), pair[1]);
    });

    test.done();
};

exports['ignore whitespace in list field muvuku'] = function(test) {

    var def = {
        fields: {
            "q": {
                type: "integer",
                list: [[0, "Yes"], [1, "No"]],
                labels: {
                    short: "question 1"
                }
            },
            "name": {
                type: "string",
                labels: {
                    short: "Name"
                }
            }
        }
    };

    var tests = [
        [
            { message: "1!0000!\t\n 0 \t\n" },
            { q: "Yes", name: undefined }
        ],
        [
            { message: "1!0000!\t\n 1 \t\n" },
            { q: "No", name: undefined }
        ],
        [
            { message: "1!0000!\t\n 1 \t\n#\n \t John Smith \n \t" },
            { q: "No", name: "John Smith" }
        ],
        [
            { message: "1!0000!\t\n 1 \t\n#\n \t John \nSmith \n \t" },
            { q: "No", name: "John \nSmith" }
        ]
    ];

    test.expect(tests.length);

    tests.forEach(function(pair) {
        test.same(smsparser.parse(def, pair[0]), pair[1]);
    });

    test.done();
};

exports['parse date field'] = function(test) {
    test.expect(2);

    var doc = {
        message: "1!0000!2012-03-12"
    };

    var def = {
        meta: {
            code: '0000'
        },
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

exports['parse date field yyyz'] = function(test) {
    test.expect(2);

    var doc = {
        message: "1!YYYZ!##2012-03-12"
    };

    var def = utils.info.getForm('YYYZ');

    var data = smsparser.parse(def, doc);
    test.same(data, {one:null, two:null, birthdate: 1331510400000});

    doc = {
        message: "YYYZ BIR2012-03-12"
    };

    data = smsparser.parse(def, doc);
    test.same(data, {birthdate: 1331510400000});

    test.done();
};

exports['parse boolean field'] = function(test) {
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

exports['parse string field mixed'] = function(test) {
    test.expect(2);

    // textforms
    var doc = {
        message: "0000 foo 16A"
    };
    var def = {
        meta: {
            code: '0000'
        },
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

exports['parse string field leading zero'] = function(test) {
    test.expect(2);

    // textforms
    var doc = {
        message: "0000 foo 012345"
    };
    var def = {
        meta: {
            code: '0000'
        },
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

exports['smsformats unstructured'] = function(test) {
    test.expect(3);

    var docs = [
        { message: "testing one two three." },
        { message: "HELP ME" },
        { message: ""} // blank message
    ];

    for (var i in docs) {
        var doc = docs[i],
            form = smsparser.getFormCode(doc.message),
            def = utils.info.getForm(form);
        // assert parsing fails
        test.same({}, smsparser.parse(def, doc));
    }

    test.done();
};

exports['smsformats structured but no form'] = function(test) {
    test.expect(2);

    var docs = [
        {message: "1!0000!1"},
        {message: "0000 ABC 123-123-123"}
    ];

    for (var i in docs) {
        var doc = docs[i],
            form = smsparser.getFormCode(doc.message),
            def = utils.info.getForm(form);
        // assert parsing fails
        test.same({}, smsparser.parse(def, doc));
    }

    test.done();
};

exports['smsformats textforms only one field'] = function(test) { 
    test.expect(1);

    var doc = { message: 'YYYY CDT33' },
        form = smsparser.getFormCode(doc.message),
        def = utils.info.getForm(form),
        data = smsparser.parse(def, doc),
        expect = {
          "quantity_dispensed": {
            "cotrimoxazole": 33,
          }
        };

    test.same(expect, data);

    test.done();
};

exports['valid message'] = function (test) {

    var def = utils.info.getForm('YYYY');
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

exports['junk example data'] = function (test) {

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

exports['one field input is parsed correctly'] = function(test) {
    var def = {
      "meta": {
         "code": "OFF",
         "label": {
            "en": "Disable Notifications",
            "sw": "Toa"
         }
      },
      "fields": {
         "patient_id": {
            "labels": {
               "tiny": {
                 "en": "ID"
               },
               "description": {
                 "en": "Patient Identifier"
               },
               "short": {
                 "en": "Patient ID"
               }
            },
            "position": 0,
            "flags": {
                "input_digits_only": true
            },
            "length": [
                5, 5
            ],
            "type": "string"
         },
         "reason": {
            "labels": {
               "tiny": {
                 "en": "r",
                 "sw": "r"
               },
               "description": {
                 "en": "Reason",
                 "sw": "Reason"
               },
               "short": {
                 "en": "Reason",
                 "sw": "Reason"
               }
            },
            "position": 1,
            "length": [
                3, 100
            ],
            "type": "string"
         }
      }
    };

    var id = 12345;
    var doc = { message: "OFF ID " + id, locale: 'en' };
    var data = smsparser.parse(def, doc);
    test.same({ patient_id: id }, data);
    test.done();

};

exports['non ascii code is accepted'] = function(test) {
    test.expect(3);

    var def = {
        meta: {
            code: 'ग'
        },
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

    // textforms
    var doc = {
        message: "ग foo 16A"
    };
    var data = smsparser.parse(def, doc);
    test.same(data, {foo: "16A"});

    // compact
    var doc = {
        message: "ग 16A"
    };
    var data = smsparser.parse(def, doc);
    test.same(data, {foo: "16A"});

    // muvuku
    doc = {
        message: "1!ग!16A"
    };
    data = smsparser.parse(def, doc);
    test.same(data, {foo: "16A"});

    test.done();

};
