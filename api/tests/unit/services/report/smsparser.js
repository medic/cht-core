const sinon = require('sinon').sandbox.create(),
      definitions = require('../../../form-definitions'),
      config = require('../../../../config'),
      smsparser = require('../../../../services/report/smsparser');

exports.tearDown = callback => {
  sinon.restore();
  callback();
};

// CHECK MUVUKU FORMAT
[
  // header is delimited by !
  '1!A!s',
  '1!A!1',
  '1!ANCR!sarah',
  '1!ANCR!sarah#11',
  // form body/values can be non alpha numeric
  '1!A!sarah#11($*&',
  // form code can be unicode
  '1!ग!sarah#11',
  // form code can be non-alphanumeric
  '1!?!sarah',
  // form code can be numbers
  '1!123!sarah',
  // form code can be numbers and letters
  '1!abc123!sarah',
  // form code can be one number or letter
  '1!a!sarah',
  '1!1!sarah',
  // anything can be in message body
  '1!a!x1',
  '1!a!?',
  '1!a!foobar🇺🇸',
  // parser code should be single number or letter followed by number
  'A1!a!x',
  'Z9!a!y'
].forEach(message => {
  exports[`is muvuku format: ${message}`] = test => {
    test.ok(smsparser.isMuvukuFormat(message));
    test.done();
  };
});

// CHECK NOT MUVUKU FORMAT
[
  // only supports ! delimiter
  '1?ANCR!sarah',
  'a?b?c',
  // parser code should be single number or letter followed by number
  '41!a!s',
  '4T!a!s',
  '00!a!s',
  // form body is required
  '1!a!'
].forEach(message => {
  exports[`is not muvuku format: ${message}`] = test => {
    test.ok(!smsparser.isMuvukuFormat(message));
    test.done();
  };
});

exports['get form none found'] = test => {
  const msg = '';
  const form = smsparser.getFormCode(msg);
  test.same(undefined, form);
  test.done();
};

exports['get form with space delimiter'] = test => {
  const msg = 'YYYY CDT33';
  const form = smsparser.getFormCode(msg);
  test.same('YYYY', form);
  test.done();
};

exports['get form with no content'] = test => {
  const msg = 'YYYY';
  const form = smsparser.getFormCode(msg);
  test.same('YYYY', form);
  test.done();
};

exports['get form is case insensitive'] = test => {
  const msg = 'yyyy CDT33';
  const form = smsparser.getFormCode(msg);
  test.same('YYYY', form);
  test.done();
};

exports['get form with hyphen delimiter'] = test => {
  const msg = 'YYYY-CDT33';
  const form = smsparser.getFormCode(msg);
  test.same('YYYY', form);
  test.done();
};

exports['get form with multiple words'] = test => {
  const msg = 'YYYY CDT33 foo bar';
  const form = smsparser.getFormCode(msg);
  test.same('YYYY', form);
  test.done();
};

exports['get form with exlamation mark delimiter'] = test => {
  const msg = 'YYYY!foo#2011#11#';
  const form = smsparser.getFormCode(msg);
  test.same('YYYY', form);
  test.done();
};

exports['get form with hash code delimiter'] = test => {
  const msg = 'YYYY#foo#2011#11#';
  const form = smsparser.getFormCode(msg);
  test.same('YYYY', form);
  test.done();
};

exports['get form with non ascii name'] = test => {
  const msg = 'द CDT33';
  const form = smsparser.getFormCode(msg);
  test.same('द', form);
  test.done();
};

exports['parse month type'] = test => {
  test.expect(1);

  const doc = { message: '1!FOO!10' },
    def = {
      meta: {code: 'FOO', label: 'Test Monthly Report'},
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

exports['validations is numeric month stays numeric'] = test => {
  const doc = { message: '1!YYYY!foo#2011#11#' };
  const def = definitions.forms.YYYY;
  const data = smsparser.parse(def, doc);
  test.same(11, data.month);
  test.done();
};

exports['form not found'] = test => {
  const doc = {
    message:'1!X0X0!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4',
    type:'sms_message',
    form:'X0X0'
  };
  const def = {};
  const data = smsparser.parse(def, doc);
  test.same({}, data);
  test.done();
};

exports['wrong field type'] = test => {
  const doc = {
    message:'1!YYYY!facility#2011#11#yyyyy#zzzz#2#3#4#5#6#9#8#7#6#5#4',
    type:'sms_message',
    form:'YYYY'
  };
  const def = definitions.forms.YYYY;
  const data = smsparser.parse(def, doc);

  test.same(data, {
    facility_id: 'facility',
    year: '2011',
    month: '11',
    misoprostol_administered: null,
    quantity_dispensed: {
      la_6x1: null,
      la_6x2: 2,
      cotrimoxazole: 3,
      zinc: 4,
      ors: 5,
      eye_ointment: 6,
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
  test.done();
};

exports['missing fields'] = test => {
  const doc = {
    message:'1!YYYY!facility#2011#11#1#1#2#3',
    type:'sms_message',
    form:'YYYY'
  };
  const def = definitions.forms.YYYY;
  const data = smsparser.parse(def, doc);
  test.same(data, {
    facility_id: 'facility',
    year: '2011',
    month: '11',
    misoprostol_administered: true,
    quantity_dispensed: {
      la_6x1: 1,
      la_6x2: 2,
      cotrimoxazole: 3,
      zinc: undefined,
      ors: undefined,
      eye_ointment: undefined,
    },
    days_stocked_out: {
      la_6x1: undefined,
      la_6x2: undefined,
      cotrimoxazole: undefined,
      zinc: undefined,
      ors: undefined,
      eye_ointment: undefined
    }
  });
  test.done();
};

exports['extra fields'] = test => {
  const doc = {
    message:'1!YYYY!facility#2011#11#0#1#2#3#1#1#1#1#1#1#1#1#1#1#####77#',
    type:'sms_message',
    form:'YYYY'
  };
  const def = definitions.forms.YYYY;
  const data = smsparser.parse(def, doc);
  test.same(data, {
    facility_id: 'facility',
    year: 2011,
    month: 11,
    misoprostol_administered: false,
    quantity_dispensed: {
      la_6x1: 1,
      la_6x2: 2,
      cotrimoxazole: 3,
      zinc: 1,
      ors: 1,
      eye_ointment: 1,
    },
    days_stocked_out: {
      la_6x1: 1,
      la_6x2: 1,
      cotrimoxazole: 1,
      zinc: 1,
      ors: 1,
      eye_ointment: 1
    },
    _extra_fields: true
  });
  test.done();
};

exports['textforms bang delimited keyval'] = test => {
  const doc = { message: 'YYYY#HFI!foobar#ZDT!999#RPY!!2012' };
  const def = definitions.forms.YYYY;
  const data = smsparser.parse(def, doc);
  test.same(data, {
    facility_id: 'foobar',
    year: 2012,
    quantity_dispensed: {
      zinc: 999
    }
  });
  test.done();
};

exports['Nepali digits transliterated into Western Arabic'] = test => {
  const doc = { message: 'YYYY#HFI!foobar#ZDT!९९९#RPY!!२०१२' };
  const def = definitions.forms.YYYY;
  const data = smsparser.parse(def, doc);
  test.same(data, {
    facility_id: 'foobar',
    year: 2012,
    quantity_dispensed: {
      zinc: 999
    }
  });
  test.same(doc.message, 'YYYY#HFI!foobar#ZDT!९९९#RPY!!२०१२');
  test.done();
};

exports['textforms dash delimited keyval'] = test => {
  const doc = { message: 'YYYY#HFI-foobar#ZDT-999#RPY--2012' };
  const def = definitions.forms.YYYY;
  const data = smsparser.parse(def, doc);
  test.same(data, {
    facility_id: 'foobar',
    year: 2012,
    quantity_dispensed: {
      zinc: 999
    }
  });
  test.done();
};

exports['textforms random ordering'] = test => {
  const doc = { message: 'YYYY CDT 33 #HFI foobar# ZDT 999 #RPY 2012' };
  const def = definitions.forms.YYYY;
  const data = smsparser.parse(def, doc);
  test.same(data, {
    facility_id: 'foobar',
    year: 2012,
    quantity_dispensed: {
      cotrimoxazole: 33,
      zinc: 999,
    }
  });
  test.done();
};

/*
 * hashes are required to parse textform messages so this parses the first
 * field and the rest of the message as the value. CDT is a number so parsing
 * that fails and returns null as the value.
 */
exports['textforms without hash delim'] = test => {
  const doc = { message: 'YYYY CDT 33 HFI foobar ZDT 999 RPY 2012' };
  const def = definitions.forms.YYYY;
  const data = smsparser.parse(def, doc);
  test.same(data, {
    quantity_dispensed: {
      cotrimoxazole: null
    }
  });
  test.done();
};

exports['textforms numeric'] = test => {
  const doc = { message: 'YYYY CDT 33# ZDT 999 #RPY2012' };
  const def = definitions.forms.YYYY;
  const data = smsparser.parse(def, doc);
  test.same(data, {
    quantity_dispensed: {
      cotrimoxazole: 33,
      zinc: 999
    },
    year: 2012
  });
  test.done();
};

exports['textforms numeric no spaces'] = test => {
  const doc = { message: 'YYYY CDT33#ZDT999#RPY2012' };
  const def = definitions.forms.YYYY;
  const data = smsparser.parse(def, doc);
  test.same(data, {
    quantity_dispensed: {
      cotrimoxazole: 33,
      zinc: 999
    },
    year: 2012
  });
  test.done();
};

exports['textforms with numeric string'] = test => {
  const doc = { message: 'YYYY CDT33#HFI001#ZDT999#RPY2012' };
  const def = definitions.forms.YYYY;
  const data = smsparser.parse(def, doc);
  test.same(data, {
    facility_id: '001',
    quantity_dispensed: {
      cotrimoxazole: 33,
      zinc: 999
    },
    year: 2012
  });
  test.done();
};

exports['textforms with numeric string and facility id with alpha'] = test => {
  const doc = { message: 'YYYY CDT33#HFI01ach#ZDT999#RPY2012' };
  const def = definitions.forms.YYYY;
  const data = smsparser.parse(def, doc);
  test.same(data, {
    facility_id: '01ach',
    quantity_dispensed: {
      cotrimoxazole: 33,
      zinc: 999
    },
    year: 2012
  });
  test.done();
};

exports['textforms with numeric string and no facility id'] = test => {
  const doc = { message: 'YYYY CDT33#ZDT999#RPY2012' };
  const def = definitions.forms.YYYY;
  const data = smsparser.parse(def, doc);
  test.same(data, {
    quantity_dispensed: {
      cotrimoxazole: 33,
      zinc: 999
    },
    year: 2012
  });
  test.done();
};

exports['parse empty list field'] = test => {
  const sms = { message: '1!0000!1#' };
  const def = {
    fields: {
      q1: {
        type: 'integer',
        list: [[0, 'Yes'], [1, 'No']],
        labels: {
          short: 'question 1'
        }
      },
      q2: {
        type: 'integer',
        list: [[0, 'Yes'], [1, 'No']],
        labels: {
          short: 'question 2'
        }
      }
    }
  };
  const data = smsparser.parse(def, sms);
  // q2 should be null. empty string attempted to be parsed as number.
  test.same(data, {q1: 'No', q2: null});
  test.done();
};

exports['parse zero value list field'] = test => {
  const sms = { message: '1!0000!0' };
  const def = {
    fields: {
      q1: {
        type: 'integer',
        list: [[0, 'Yes'], [1, 'No']],
        labels: {
          short: 'question 1'
        }
      }
    }
  };
  const data = smsparser.parse(def, sms);
  test.same(data, {q1: 'Yes'});
  test.done();
};

exports['ignore whitespace in list field textforms'] = test => {
  const def = {
    meta: {
      code: 'ABCD'
    },
    fields: {
      q: {
        type: 'integer',
        list: [[0, 'Yes'], [1, 'No']],
        labels: {
          tiny: 'q'
        }
      },
      name: {
        type: 'string',
        labels: {
          tiny: 'name'
        }
      }
    }
  };
  const tests = [
    [
      { message: '\t\nABCD \t \n \t Q \t\n 1 \t\n' },
      { q: 'No' }
    ],
    [
      { message: '\t\nABCD \t\n Q \t\n 0 \t\n' },
      { q: 'Yes' }
    ],
    [
      { message: '\t\n ABCD\t\n  Q \t\n 0 \t\n# \t\n Name John Smith\n \t' },
      { q: 'Yes', name: 'John Smith' }
    ],
    [
      { message: '\t\nABCD\t \n Q \t\n 1 \t \n# \t\n Name  \t \n John Smith\n \t' },
      { q: 'No', name: 'John Smith' }
    ]
  ];
  tests.forEach(pair => {
    test.same(smsparser.parse(def, pair[0]), pair[1]);
  });
  test.done();
};

exports['ignore whitespace in list field muvuku'] = test => {
  const def = {
    fields: {
      q: {
        type: 'integer',
        list: [[0, 'Yes'], [1, 'No']],
        labels: {
          short: 'question 1'
        }
      },
      name: {
        type: 'string',
        labels: {
          short: 'Name'
        }
      }
    }
  };
  const tests = [
    [
      { message: '1!0000!\t\n 0 \t\n' },
      { q: 'Yes', name: undefined }
    ],
    [
      { message: '1!0000!\t\n 1 \t\n' },
      { q: 'No', name: undefined }
    ],
    [
      { message: '1!0000!\t\n 1 \t\n#\n \t John Smith \n \t' },
      { q: 'No', name: 'John Smith' }
    ],
    [
      { message: '1!0000!\t\n 1 \t\n#\n \t John \nSmith \n \t' },
      { q: 'No', name: 'John \nSmith' }
    ]
  ];
  tests.forEach(pair => {
    test.same(smsparser.parse(def, pair[0]), pair[1]);
  });
  test.done();
};

exports['parse date field: muvuku'] = test => {
  const doc = { message: '1!0000!2012-03-12' };
  const def = {
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
  const data = smsparser.parse(def, doc);
  test.same(data, {testdate: 1331510400000});
  test.done();
};

exports['parse date field: textforms'] = test => {
  const doc = { message: '0000 TDATE 2012-03-12' };
  const def = {
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
  const data = smsparser.parse(def, doc);
  test.same(data, {testdate: 1331510400000});
  test.done();
};

exports['parse date field yyyz: muvuku'] = test => {
  const doc = { message: '1!YYYZ!##2012-03-12' };
  const def = definitions.forms.YYYZ;
  const data = smsparser.parse(def, doc);
  test.same(data, {one:null, two:null, birthdate: 1331510400000});
  test.done();
};

exports['parse date field yyyz 2: textforms'] = test => {
  const doc = { message: 'YYYZ BIR2012-03-12' };
  const def = definitions.forms.YYYZ;
  const data = smsparser.parse(def, doc);
  test.same(data, {birthdate: 1331510400000});
  test.done();
};

exports['parse boolean field: true'] = test => {
  const doc = { message: '1!0000!1' };
  const def = {
    fields: {
      testbool: {
        type: 'boolean',
        labels: 'testbool'
      }
    }
  };
  const data = smsparser.parse(def, doc);
  test.same(data, {testbool: true});
  test.done();
};

exports['parse boolean field: false'] = test => {
  const doc = { message: '1!0000!0' };
  const def = {
    fields: {
      testbool: {
        type: 'boolean',
        labels: 'testbool'
      }
    }
  };
  const data = smsparser.parse(def, doc);
  test.same(data, {testbool: false});
  test.done();
};

exports['parse string field mixed: muvuku'] = test => {
  const doc = { message: '1!0000!16A' };
  const def = {
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
  const data = smsparser.parse(def, doc);
  test.same(data, {foo: '16A'});
  test.done();
};

exports['parse string field mixed: textforms'] = test => {
  const doc = { message: '0000 foo 16A' };
  const def = {
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
  const data = smsparser.parse(def, doc);
  test.same(data, {foo: '16A'});
  test.done();
};

exports['parse string field with exlamation mark: textforms'] = test => {
  const doc = { message: '0000 foo 16A!' };
  const def = {
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
  const data = smsparser.parse(def, doc);
  test.same(data, {foo: '16A!'});
  test.done();
};

exports['parse string field with exlamation mark: muvuku'] = test => {
  const doc = { message: '1!0000!16A!' };
  const def = {
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
  const data = smsparser.parse(def, doc);
  test.same(data, {foo: '16A!'});
  test.done();
};

exports['parse string field leading zero: textforms'] = test => {
  const doc = { message: '0000 foo 012345' };
  const def = {
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
  const data = smsparser.parse(def, doc);
  test.same(data, {foo: '012345'});
  test.done();
};

exports['parse string field leading zero: muvuku'] = test => {
  const doc = { message: '1!0000!012345' };
  const def = {
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
  const data = smsparser.parse(def, doc);
  test.same(data, {foo: '012345'});
  test.done();
};

exports['smsformats unstructured'] = test => {
  const docs = [
    { message: 'testing one two three.' },
    { message: 'HELP ME' },
    { message: ''} // blank message
  ];
  docs.forEach(doc => {
    test.same({}, smsparser.parse(null, doc));
  });
  test.done();
};

exports['smsformats structured but no form'] = test => {
  const docs = [
    {message: '1!0000!1'},
    {message: '0000 ABC 123-123-123'}
  ];
  docs.forEach(doc => {
    test.same({}, smsparser.parse(null, doc));
  });

  test.done();
};

exports['smsformats textforms only one field'] = test =>{ 
  const doc = { message: 'YYYY CDT33' };
  const data = smsparser.parse(definitions.forms.YYYY, doc);
  const expect = {
    quantity_dispensed: {
    cotrimoxazole: 33,
    }
  };
  test.same(expect, data);
  test.done();
};

exports['valid muvuku message'] = test => {
  const def = definitions.forms.YYYY;
  const doc = {
    sent_timestamp: '12-11-11 15:00',
    from: '+15551212',
    message: '1!YYYY!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4'
  };
  const actual = smsparser.parse(def, doc);
  test.same(actual, {
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

  const arr = smsparser.parseArray(def, doc);
  test.same(
    arr,
    ['12-11-11 15:00', '+15551212', 'facility', '2011', '11', false, 1, 2, 3, 4, 5, 6, 9, 8, 7, 6, 5, 4]
  );
  test.done();
};

exports['valid javarosa message'] = test => {
  const def = definitions.forms.YYYY;
  const doc = {
    sent_timestamp: '12-11-11 15:00',
    from: '+15551212',
    message: 'J1!YYYY!HFI#facility#RPY#2011#RPM#11#MSP#0#L1T#1#L2T#2#CDT#3#ZDT#4#ODT#5#EOT#6#L1O#9#L2O#8#CDO#7#ZDO#6#ODO#5#EDO#4'
  };
  const obj = smsparser.parse(def, doc);
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
  const arr = smsparser.parseArray(def, doc);
  test.same(
    arr,
    ['12-11-11 15:00', '+15551212', 'facility', '2011', '11', false, 1, 2, 3, 4, 5, 6, 9, 8, 7, 6, 5, 4]
  );
  test.done();
};

exports['valid javarosa message, random field ordering'] = test => {
  const def = definitions.forms.YYYY;
  const doc = {
    sent_timestamp: '12-11-11 15:00',
    from: '+15551212',
    message: 'J1!YYYY!EDO#4#ODT#5#RPM#11#L2T#2#HFI#facility#CDT#3#CDO#7#MSP#0#ZDO#6#L1O#9#RPY#2011#EOT#6#ODO#5#L1T#1#ZDT#4#L2O#8'
  };
  const obj = smsparser.parse(def, doc);
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
  const arr = smsparser.parseArray(def, doc);
  test.same(
    arr,
    ['12-11-11 15:00', '+15551212', 'facility', '2011', '11', false, 1, 2, 3, 4, 5, 6, 9, 8, 7, 6, 5, 4]
  );
  test.done();
};

exports['valid javarosa message, fields missing'] = test => {
  const def = definitions.forms.YYYY;
  const doc = {
    sent_timestamp: '12-11-11 15:00',
    from: '+15551212',
    message: 'J1!YYYY!EDO#4#ODT#5#RPM#11#L2T#2#HFI#facility#CDT#3#CDO#7#MSP#0#ZDO#6#L1O#9#RPY#2011#EOT#6'
  };
  const obj = smsparser.parse(def, doc);
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
  const arr = smsparser.parseArray(def, doc);
  test.same(
    arr,
    ['12-11-11 15:00', '+15551212', 'facility', '2011', '11', '0', undefined, '2', '3', undefined, '5', '6', '9', undefined, '7', '6', undefined, '4']
  );
  test.done();
};

exports['valid javarosa message, values contain escaped delimiters'] = test => {
  const def = definitions.forms.YYYY;
  const doc = {
    sent_timestamp: '12-11-11 15:00',
    from: '+15551212',
    message: 'J1!YYYY!L2T#2#HFI#fa\\cility\\#2\\#3#CDT#3#CDO#7'
  };
  const obj = smsparser.parse(def, doc);
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
  const arr = smsparser.parseArray(def, doc);
  test.same(
    arr,
    ['12-11-11 15:00', '+15551212', 'fa\\cility#2#3', undefined, undefined, undefined, undefined, '2', '3', undefined, undefined, undefined, undefined, undefined, '7', undefined, undefined, undefined]
  );
  test.done();
};

exports['parse javarosa message with special characters in a value'] = test => {
  const def = definitions.forms.YYYY;
  const doc = {
    sent_timestamp: '12-11-11 15:00',
    from: '+15551212',
    message: 'J1!YYYY!HFI#!fac*!?ty!#RPY#2015'
  };
  const obj = smsparser.parse(def, doc);
  test.same(obj.facility_id, '!fac*!?ty!');
  test.same(obj.year, 2015);
  test.done();
};

exports['valid javarosa message with similarly named fields parses right'] = test => {
  const def = {
    meta: {
      code: 'T',
      label: 'Test'
    },
    fields: {
      problem: {
      labels: {
        short: 'Health Facility Identifier',
        tiny: 'P'
      },
      type: 'string'
      },
      meta_problem: {
      labels: {
        short: 'Health Facility Identifier',
        tiny: 'MetaP'
      },
      type: 'string'
      }
    }
  };
  const doc = {
    sent_timestamp: '12-11-11 15:00',
    from: '+15551212',
    message: 'J1!T!p#Bar#metap#foo'
  };
  const obj = smsparser.parse(def, doc);
  test.same(obj, {
    problem: 'Bar',
    meta_problem: 'foo'
  });
  const arr = smsparser.parseArray(def, doc);
  test.same(
    arr,
    ['12-11-11 15:00', '+15551212', 'Bar', 'foo']
  );
  test.done();
};

exports['valid javarosa message with space in label parses right'] = test => {
  const def = {
    meta: {
      code: 'T',
      label: 'Test'
    },
    fields: {
      problem: {
      labels: {
        short: 'Health Facility Identifier',
        tiny: 'P'
      }
      },
      meta_problem: {
      labels: {
        short: 'Health Facility Identifier',
        tiny: 'MetaP'
      }
      }
    }
  };
  const doc = {
    sent_timestamp: '12-11-11 15:00',
    from: '+15551212',
    // whitespace in label submissions
    message: 'J1!T!p #Bar#  metap#foo'
  };
  const obj = smsparser.parse(def, doc);
  test.same(obj, {
    problem: 'Bar',
    meta_problem: 'foo'
  });
  const arr = smsparser.parseArray(def, doc);
  test.same(
    arr,
    ['12-11-11 15:00', '+15551212', 'Bar', 'foo']
  );
  test.done();
};

exports['handles unmatched labels'] = test => {
  const def = {
    meta: {
      code: 'T',
      label: 'Test'
    },
    fields: {
      one: {
      labels: {
        short: 'one',
        tiny: 'one'
      }
      },
      odd: {
      labels: {
        short: 'odd',
        tiny: 'odd'
      }
      }
    }
  };
  const doc = {
    sent_timestamp: '12-11-11 15:00',
    from: '+15551212',
    message: 'J1!T!one#two#odd'
  };
  const obj = smsparser.parse(def, doc);
  test.same(obj, {
    one: 'two',
    odd: undefined
  });
  test.done();
};

exports['junk example data'] = test => {
  const doc = {
    sent_timestamp: '2-1-12 15:35',
    from: '+13125551212',
    message: 'xox+o123'
  };
  const obj = smsparser.parse(null, doc);
  const expectedObj = {};
  test.same(obj, expectedObj);
  const arr = smsparser.parseArray(null, doc);
  const expectedArr = [];
  test.same(arr, expectedArr);
  test.done();
};

exports['one field input is parsed correctly'] = test => {
  const def = {
    meta: {
     code: 'OFF',
     label: {
      en: 'Disable Notifications',
      sw: 'Toa'
     }
    },
    fields: {
     patient_id: {
      labels: {
         tiny: {
         en: 'ID'
         },
         description: {
         en: 'Patient Identifier'
         },
         short: {
         en: 'Patient ID'
         }
      },
      position: 0,
      flags: {
        input_digits_only: true
      },
      length: [
        5, 5
      ],
      type: 'string'
     },
     reason: {
      labels: {
         tiny: {
         en: 'r',
         sw: 'r'
         },
         description: {
         en: 'Reason',
         sw: 'Reason'
         },
         short: {
         en: 'Reason',
         sw: 'Reason'
         }
      },
      position: 1,
      length: [
        3, 100
      ],
      type: 'string'
     }
    }
  };
  const id = 12345;
  const doc = { message: 'OFF ID ' + id, locale: 'en' };
  const data = smsparser.parse(def, doc);
  test.same({ patient_id: id }, data);
  test.done();
};

exports['non ascii code is accepted'] = test => {
  const def = {
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
  let doc = { message: 'ग foo 16A' };
  let data = smsparser.parse(def, doc);
  test.same(data, {foo: '16A'});

  // compact
  doc = { message: 'ग 16A' };
  data = smsparser.parse(def, doc);
  test.same(data, {foo: '16A'});

  // muvuku
  doc = { message: '1!ग!16A' };
  data = smsparser.parse(def, doc);
  test.same(data, {foo: '16A'});

  test.done();

};

exports['support textforms locale on tiny labels'] = test => {

  const def = {
    meta: {
      code: 'R'
    },
    fields: {
      name: {
        type: 'string',
        labels: {
          short: 'Name',
          tiny: {
            en: 'n',
            sw: 'j'
          }
        }
      }
    }
  };

  // textforms with locale mismatch parses as compact format
  let doc = {
    message: 'R n jane',
    locale: 'sw'
  };
  let data = smsparser.parse(def, doc, doc.locale);
  test.same(data, {name: 'n jane'});

  // textforms with locale match parses correctly
  doc = {
    message: 'R j jane',
    locale: 'sw'
  };
  data = smsparser.parse(def, doc);
  test.same(data, {name: 'jane'});

  // same thing but case insensitive check
  doc = {
    message: 'r J jane',
    locale: 'sw'
  };
  data = smsparser.parse(def, doc);
  test.same(data, {name: 'jane'});

  // compact parses correctly
  doc = {
    message: 'R jane'
  };
  data = smsparser.parse(def, doc);
  test.same(data, {name: 'jane'});

  // muvuku parses correctly
  doc = {
    message: '1!R!jane'
  };
  data = smsparser.parse(def, doc);
  test.same(data, {name: 'jane'});

  test.done();

};

exports['support translation keys on tiny labels'] = test => {

  const def = {
    meta: {
      code: 'R'
    },
    fields: {
      name: {
        type: 'string',
        labels: {
          short: 'Name',
          tiny: 'form.r.name.tiny'
        }
      }
    }
  };

  sinon.stub(config, 'translate')
    .withArgs('form.r.name.tiny', 'sw').returns('J')
    .withArgs('Name', 'sw').returns('Name')
    .withArgs('jane').returns('jane');

  // textforms with locale match parses correctly
  let doc = {
    message: 'R j jane',
    locale: 'sw'
  };
  let data = smsparser.parse(def, doc);
  test.same(data, {name: 'jane'});

  // same thing but case insensitive check
  doc = {
    message: 'r J jane',
    locale: 'sw'
  };
  data = smsparser.parse(def, doc);
  test.same(data, {name: 'jane'});

  // compact parses correctly
  doc = {
    message: 'R jane'
  };
  data = smsparser.parse(def, doc);
  test.same(data, {name: 'jane'});

  // muvuku parses correctly
  doc = {
    message: '1!R!jane'
  };
  data = smsparser.parse(def, doc);
  test.same(data, {name: 'jane'});

  test.done();

};

exports['support mixed case field keys'] = test => {

  const def = {
    meta: {
      code: 'R'
    },
    fields: {
      ooOoo: {
        type: 'string',
        labels: {
          tiny: 'n'
        }
      }
    }
  };

  // textforms
  let doc = {
    message: 'R n jane',
  };
  let data = smsparser.parse(def, doc);
  test.same(data, {ooOoo: 'jane'});

  // compact textforms
  doc = {
    message: 'R jane'
  };
  data = smsparser.parse(def, doc);
  test.same(data, {ooOoo: 'jane'});

  // muvuku
  doc = {
    message: '1!R!jane'
  };
  data = smsparser.parse(def, doc);
  test.same(data, {ooOoo: 'jane'});

  test.done();

};

exports['support uppercase field keys'] = test => {

  const def = {
    meta: {
      code: 'R'
    },
    fields: {
      OOOOO: {
        type: 'string',
        labels: {
          tiny: 'n'
        }
      }
    }
  };

  // textforms
  let doc = {
    message: 'R n jane',
  };
  let data = smsparser.parse(def, doc);
  test.same(data, {OOOOO: 'jane'});

  // compact textforms
  doc = {
    message: 'R jane'
  };
  data = smsparser.parse(def, doc);
  test.same(data, {OOOOO: 'jane'});

  // muvuku
  doc = {
    message: '1!R!jane'
  };
  data = smsparser.parse(def, doc);
  test.same(data, {OOOOO: 'jane'});

  test.done();

};

exports['support regex chars in form code, parser escapes them'] = test => {
  const def = {
    meta: {
      code: '.*.*'
    },
    fields: {
      name: {
        type: 'string',
        labels: {
          short: 'Name',
          tiny: {
            en: 'n'
          }
        }
      }
    }
  };
  const doc = {
    message: '.*.*  n jane'
  };
  const data = smsparser.parse(def, doc);
  test.same(data, {name: 'jane'});
  test.done();
};
