var smsparser = require('views/lib/smsparser'),
    javarosa_parser = require('views/lib/javarosa_parser'),
    sinon = require('sinon'),
    definitions = require('../../test-helpers/form_definitions');

exports.setUp = function (callback) {
    callback();
};

exports.tearDown = function(callback) {
    callback();
};

exports['getFormCode returns form code'] = function(test) {
    var msg = 'J1!YYYY!HFI#facility'
    var form = smsparser.getFormCode(msg);
    test.same('YYYY', form);
    test.done();
};

exports['getParts handles escaped data'] = function (test) {
  var msg = 'J1!ZZ!L2T#2#HFI#fa\\cility\\#2\\#3#CDT#3';
  var parts = javarosa_parser._getParts(msg);
  console.log('parts',parts);
  test.same(parts, ["L2T", "2", "HFI", "fa\\cility#2#3", "CDT", "3"]);
  test.done();
};

exports['getParts handles empty fields'] = function (test) {
  var msg = 'J1!ZZ!####';
  // todo: only passes using method 1
  var parts = javarosa_parser._getParts(msg, 1);
  console.log('parts', parts);
  test.same(parts, []);
  test.done();
};

exports['parser handles precending and trailing fields'] = function(test) {
  var msg = 'J1!R!##n#jane#';
  // todo: only passes using method 1
  var parts = javarosa_parser._getParts(msg, 1);
  console.log('parts',parts);
  test.same(parts, ["n", "jane"]);
  test.done();
};

exports['valid message'] = function (test) {
    var def = definitions.forms.YYYY;
    var doc = {
        sent_timestamp: '12-11-11 15:00',
        from: '+15551212',
        message: 'J1!YYYY!HFI#facility#RPY#2011#RPM#11#MSP#0#L1T#1#L2T#2#CDT#3#ZDT#4#ODT#5#EOT#6#L1O#9#L2O#8#CDO#7#ZDO#6#ODO#5#EDO#4'
    };

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

exports['valid message, random field ordering'] = function (test) {
    var def = definitions.forms.YYYY;
    var doc = {
        sent_timestamp: '12-11-11 15:00',
        from: '+15551212',
        message: 'J1!YYYY!EDO#4#ODT#5#RPM#11#L2T#2#HFI#facility#CDT#3#CDO#7#MSP#0#ZDO#6#L1O#9#RPY#2011#EOT#6#ODO#5#L1T#1#ZDT#4#L2O#8'
    };
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

exports['valid message, fields missing'] = function (test) {
    var def = definitions.forms.YYYY;
    var doc = {
        sent_timestamp: '12-11-11 15:00',
        from: '+15551212',
        message: 'J1!YYYY!EDO#4#ODT#5#RPM#11#L2T#2#HFI#facility#CDT#3#CDO#7#MSP#0#ZDO#6#L1O#9#RPY#2011#EOT#6'
    };

    var obj = smsparser.parse(def, doc);
    test.same(obj, {
        facility_id: 'facility',
        year: '2011',
        month: '11',
        misoprostol_administered: false,
        quantity_dispensed: {
            la_6x1: undefined,
            la_6x2: 2,
            cotrimoxazole: 3,
            zinc: undefined,
            ors: 5,
            eye_ointment: 6
        },
        days_stocked_out: {
            la_6x1: 9,
            la_6x2: undefined,
            cotrimoxazole: 7,
            zinc: 6,
            ors: undefined,
            eye_ointment: 4
        }
    });

    var arr = smsparser.parseArray(def, doc);
    test.same(
        arr,
        ["12-11-11 15:00", "+15551212", "facility", "2011", "11", "0", undefined, "2", "3", undefined, "5", "6", "9", undefined, "7", "6", undefined, "4"]
    );

    test.done();
};

exports['valid message, values contain escaped delimiters'] = function (test) {
    var def = definitions.forms.YYYY;
    var doc = {
        sent_timestamp: '12-11-11 15:00',
        from: '+15551212',
        message: 'J1!YYYY!L2T#2#HFI#fa\\cility\\#2\\#3#CDT#3#CDO#7'
    };

    var obj = smsparser.parse(def, doc);
    test.same(obj, {
        facility_id: 'fa\\cility#2#3',
        year: undefined,
        month: undefined,
        misoprostol_administered: undefined,
        quantity_dispensed: {
            la_6x1: undefined,
            la_6x2: 2,
            cotrimoxazole: 3,
            zinc: undefined,
            ors: undefined,
            eye_ointment: undefined
        },
        days_stocked_out: {
            la_6x1: undefined,
            la_6x2: undefined,
            cotrimoxazole: 7,
            zinc: undefined,
            ors: undefined,
            eye_ointment: undefined
        }
    });

    var arr = smsparser.parseArray(def, doc);
    test.same(
        arr,
        ["12-11-11 15:00", "+15551212", "fa\\cility#2#3", undefined, undefined, undefined, undefined, "2", "3", undefined, undefined, undefined, undefined, undefined, "7", undefined, undefined, undefined]
    );

    test.done();
};

exports['parse message with special characters in a value'] = function (test) {
    var def = definitions.forms.YYYY;
    var doc = {
        sent_timestamp: '12-11-11 15:00',
        from: '+15551212',
        message: 'J1!YYYY!HFI#!fac*!?ty!#RPY#2015'
    };
    var obj = smsparser.parse(def, doc);
    test.same(obj.facility_id, "!fac*!?ty!");
    test.same(obj.year, 2015);
    test.done();
};

exports['valid message with similarly named fields parses right'] = function (test) {
    var def = {
        "meta": {
          "code": "T",
          "label": "Test"
        },
        "fields": {
          "problem": {
            "labels": {
              "short": "Health Facility Identifier",
              "tiny": "P"
            },
            "type": "string"
          },
          "meta_problem": {
            "labels": {
              "short": "Health Facility Identifier",
              "tiny": "MetaP"
            },
            "type": "string"
          }
        }
    };
    var doc = {
        sent_timestamp: '12-11-11 15:00',
        from: '+15551212',
        message: 'J1!T!p#Bar#metap#foo'
    };
    var obj = smsparser.parse(def, doc);
    test.same(obj, {
        problem: "Bar",
        meta_problem: "foo"
    });
    var arr = smsparser.parseArray(def, doc);
    test.same(
        arr,
        ["12-11-11 15:00", "+15551212", "Bar", "foo"]
    );
    test.done();
};

exports['valid message with space in label parses right'] = function (test) {
    var def = {
        "meta": {
          "code": "T",
          "label": "Test"
        },
        "fields": {
          "problem": {
            "labels": {
              "short": "Health Facility Identifier",
              "tiny": "P"
            }
          },
          "meta_problem": {
            "labels": {
              "short": "Health Facility Identifier",
              "tiny": "MetaP"
            }
          }
        }
    };
    var doc = {
        sent_timestamp: '12-11-11 15:00',
        from: '+15551212',
        // whitespace in label submissions
        message: 'J1!T!p #Bar#  metap#foo'
    };
    var obj = smsparser.parse(def, doc);
    test.same(obj, {
        problem: "Bar",
        meta_problem: "foo"
    });
    var arr = smsparser.parseArray(def, doc);
    test.same(
        arr,
        ["12-11-11 15:00", "+15551212", "Bar", "foo"]
    );
    test.done();
};

exports['parser handles empty label'] = function(test) {
    var def = {
        meta: {
            code: 'R'
        },
        fields: {
            name: {
                type: 'string',
                labels: {
                    short: 'Name',
                    tiny: {
                        en: ''
                    }
                }
            }
        }
    };
    var doc = {
        message: "J1!R!n#jane"
    };
    var data = smsparser.parse(def, doc);
    test.same(data, {name: undefined});
    test.done();
};
