const sinon = require('sinon');
const chai = require('chai');
const definitions = require('../../../form-definitions');
const config = require('../../../../src/config');
const smsparser = require('../../../../src/services/report/smsparser');
const moment = require('moment');

describe('sms parser', () => {

  afterEach(() => {
    sinon.restore();
  });

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
    it(`is muvuku format: ${message}`, () => {
      chai.expect(smsparser.isMuvukuFormat(message)).to.equal(true);
    });
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
    it(`is not muvuku format: ${message}`, () => {
      chai.expect(smsparser.isMuvukuFormat(message)).to.equal(false);
    });
  });

  it('get form none found', () => {
    chai.expect(smsparser.getFormCode('')).to.equal(undefined);
  });

  it('get form with space delimiter', () => {
    chai.expect(smsparser.getFormCode('YYYY CDT33')).to.equal('YYYY');
  });

  it('get form with no content', () => {
    chai.expect(smsparser.getFormCode('YYYY')).to.equal('YYYY');
  });

  it('get form is case insensitive', () => {
    chai.expect(smsparser.getFormCode('yyyy CDT33')).to.equal('YYYY');
  });

  it('get form with hyphen delimiter', () => {
    chai.expect(smsparser.getFormCode('YYYY-CDT33')).to.equal('YYYY');
  });

  it('get form with multiple words', () => {
    chai.expect(smsparser.getFormCode('YYYY CDT33 foo bar')).to.equal('YYYY');
  });

  it('get form with exlamation mark delimiter', () => {
    chai.expect(smsparser.getFormCode('YYYY!foo#2011#11#')).to.equal('YYYY');
  });

  it('get form with hash code delimiter', () => {
    chai.expect(smsparser.getFormCode('YYYY#foo#2011#11#')).to.equal('YYYY');
  });

  it('get form with non ascii name', () => {
    chai.expect(smsparser.getFormCode('द CDT33')).to.equal('द');
  });

  it('accepts phone number with extension', () => {
    const doc = { message: 'NP 20 +9779841202020' };
    const def = definitions.forms.NP;
    sinon.stub(config, 'getAll').returns({
      default_country_code: 977,
      phone_validation: 'full'
    });
    const data = smsparser.parse(def, doc);
    chai.expect(data.phone_number).to.equal('+9779841202020');
  });

  it('accepts correct phone number without extension', () => {
    const doc = { message: 'NP 20 9841202020' };
    const def = definitions.forms.NP;
    sinon.stub(config, 'getAll').returns({
      default_country_code: 977,
      phone_validation: 'full'
    });
    const data = smsparser.parse(def, doc);
    chai.expect(data.phone_number).to.equal('+9779841202020');
  });

  it('returns null if phone number is invalid for the region', () => {
    const doc = { message: 'NP 20 +97712312 Prajwol' };
    const def = definitions.forms.NP;
    sinon.stub(config, 'getAll').returns({
      default_country_code: 977,
      phone_validation: 'full'
    });
    const data = smsparser.parse(def, doc);
    chai.expect(data.phone_number).to.equal(null);
  });

  it('returns null if phone number is invalid for default region', () => {
    const doc = { message: 'NP 20 8750660880 Prajwol' };
    const def = definitions.forms.NP;
    sinon.stub(config, 'getAll').returns({
      default_country_code: 977,
      phone_validation: 'full'
    });
    const data = smsparser.parse(def, doc);
    chai.expect(data.phone_number).to.equal(null);
  });

  //India , Kenya, Tanzania Phone is accepted as contact info in Nepal region.
  //Just incase we make cross region/borders tool
  [['NP 20 +918750660880 Prajwol', '+918750660880'],
    ['NP 20 +254773087889 Prajwol', '+254773087889'],
    ['NP 20 +255712262987 Prajwol', '+255712262987']].forEach(phoneNumerWithParsed => {
    it(`returns parsed number if valid phone of another the region: ${phoneNumerWithParsed[0]}`, () => {
      const doc = { message: phoneNumerWithParsed[0] };
      const def = definitions.forms.NP;
      sinon.stub(config, 'getAll').returns({
        default_country_code: 977,
        phone_validation: 'full'
      });
      const data = smsparser.parse(def, doc);
      chai.expect(data.phone_number).to.equal(phoneNumerWithParsed[1]);
    });
  });

  it('parse month type', () => {
    const doc = { message: '1!FOO!10' };
    const def = {
      meta: { code: 'FOO', label: 'Test Monthly Report' },
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
    };
    const data = smsparser.parse(def, doc);
    chai.expect(data.month).to.equal(10);
  });

  it('form not found', () => {
    const doc = {
      message: '1!X0X0!facility#2011#11#1#2#3#4#5#6#9#8#7#6#5#4',
      type: 'sms_message',
      form: 'X0X0'
    };
    const def = {};
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({});
  });

  it('wrong field type', () => {
    const doc = {
      message: '1!YYYY!facility#2011#11#yyyyy#zzzz#2#3#4#5#6#9#8#7#6#5#4',
      type: 'sms_message',
      form: 'YYYY'
    };
    const def = definitions.forms.YYYY;
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({
      facility_id: 'facility',
      year: 2011,
      month: 'November',
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
  });

  it('missing fields', () => {
    const doc = {
      message: '1!YYYY!facility#2011#11#1#1#2#3',
      type: 'sms_message',
      form: 'YYYY'
    };
    const def = definitions.forms.YYYY;
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({
      facility_id: 'facility',
      year: 2011,
      month: 'November',
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
  });

  it('extra fields', () => {
    const doc = {
      message: '1!YYYY!facility#2011#11#0#1#2#3#1#1#1#1#1#1#1#1#1#1#####77#',
      type: 'sms_message',
      form: 'YYYY'
    };
    const def = definitions.forms.YYYY;
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({
      facility_id: 'facility',
      year: 2011,
      month: 'November',
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
  });

  it('textforms bang delimited keyval', () => {
    const doc = { message: 'YYYY#HFI!foobar#ZDT!999#RPY!!2012' };
    const def = definitions.forms.YYYY;
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({
      facility_id: 'foobar',
      year: 2012,
      quantity_dispensed: {
        zinc: 999
      }
    });
  });

  it('Nepali digits transliterated into Western Arabic', () => {
    const doc = { message: 'YYYY#HFI!foobar#ZDT!९९९#RPY!!२०१२' };
    const def = definitions.forms.YYYY;
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({
      facility_id: 'foobar',
      year: 2012,
      quantity_dispensed: {
        zinc: 999
      }
    });
    chai.expect(doc.message).to.equal('YYYY#HFI!foobar#ZDT!९९९#RPY!!२०१२');
  });

  it('textforms dash delimited keyval', () => {
    const doc = { message: 'YYYY#HFI-foobar#ZDT-999#RPY--2012' };
    const def = definitions.forms.YYYY;
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({
      facility_id: 'foobar',
      year: 2012,
      quantity_dispensed: {
        zinc: 999
      }
    });
  });

  it('textforms random ordering', () => {
    const doc = { message: 'YYYY CDT 33 #HFI foobar# ZDT 999 #RPY 2012' };
    const def = definitions.forms.YYYY;
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({
      facility_id: 'foobar',
      year: 2012,
      quantity_dispensed: {
        cotrimoxazole: 33,
        zinc: 999,
      }
    });
  });

  /*
   * hashes are required to parse textform messages so this parses the first
   * field and the rest of the message as the value. CDT is a number so parsing
   * that fails and returns null as the value.
   */
  it('textforms without hash delim', () => {
    const doc = { message: 'YYYY CDT 33 HFI foobar ZDT 999 RPY 2012' };
    const def = definitions.forms.YYYY;
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({
      quantity_dispensed: {
        cotrimoxazole: null
      }
    });
  });

  it('textforms numeric', () => {
    const doc = { message: 'YYYY CDT 33# ZDT 999 #RPY2012' };
    const def = definitions.forms.YYYY;
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({
      quantity_dispensed: {
        cotrimoxazole: 33,
        zinc: 999
      },
      year: 2012
    });
  });

  it('textforms numeric no spaces', () => {
    const doc = { message: 'YYYY CDT33#ZDT999#RPY2012' };
    const def = definitions.forms.YYYY;
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({
      quantity_dispensed: {
        cotrimoxazole: 33,
        zinc: 999
      },
      year: 2012
    });
  });

  it('textforms with numeric string', () => {
    const doc = { message: 'YYYY CDT33#HFI001#ZDT999#RPY2012' };
    const def = definitions.forms.YYYY;
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({
      facility_id: '001',
      quantity_dispensed: {
        cotrimoxazole: 33,
        zinc: 999
      },
      year: 2012
    });
  });

  it('textforms with numeric string and facility id with alpha', () => {
    const doc = { message: 'YYYY CDT33#HFI01ach#ZDT999#RPY2012' };
    const def = definitions.forms.YYYY;
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({
      facility_id: '01ach',
      quantity_dispensed: {
        cotrimoxazole: 33,
        zinc: 999
      },
      year: 2012
    });
  });

  it('textforms with numeric string and no facility id', () => {
    const doc = { message: 'YYYY CDT33#ZDT999#RPY2012' };
    const def = definitions.forms.YYYY;
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({
      quantity_dispensed: {
        cotrimoxazole: 33,
        zinc: 999
      },
      year: 2012
    });
  });

  it('parse empty list field', () => {
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
    chai.expect(data).to.deep.equal({ q1: 'No', q2: null });
  });

  it('parse zero value list field', () => {
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
    chai.expect(data).to.deep.equal({ q1: 'Yes' });
  });

  it('ignore whitespace in list field textforms', () => {
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
      chai.expect(smsparser.parse(def, pair[0])).to.deep.equal(pair[1]);
    });
  });

  it('ignore whitespace in list field muvuku', () => {
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
      chai.expect(smsparser.parse(def, pair[0])).to.deep.equal(pair[1]);
    });
  });

  it('parse date field: muvuku', () => {
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
    chai.expect(data).to.deep.equal({ testdate: moment('2012-03-12').valueOf() });
  });

  it('parse date field: textforms', () => {
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
    chai.expect(data).to.deep.equal({ testdate: 1331510400000 });
  });

  it('parse date field yyyz: muvuku', () => {
    const doc = { message: '1!YYYZ!##2012-03-12' };
    const def = definitions.forms.YYYZ;
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({
      one: null,
      two: null,
      birthdate: moment('2012-03-12').valueOf()
    });
  });

  it('parse date field yyyz 2: textforms', () => {
    const doc = { message: 'YYYZ BIR2012-03-12' };
    const def = definitions.forms.YYYZ;
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({ birthdate: 1331510400000 });
  });

  it('parse bsDate field: muvuku', () => {
    const doc = { message: '1!0000!2068-11-29' };//
    const def = {
      meta: {
        code: '0000'
      },
      fields: {
        testdate: {
          type: 'bsDate',
          labels: {
            short: 'testdate',
            tiny: 'TDATE'
          }
        }
      }
    };
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({ testdate: moment('2012-03-12').valueOf() });
  });

  it('parse bsDate field: compact textforms', () => {
    const doc = { message: '0000 2068-11-29' };
    const def = {
      meta: {
        code: '0000'
      },
      fields: {
        testdate: {
          type: 'bsDate',
          labels: {
            short: 'testdate',
            tiny: 'TDATE'
          }
        }
      }
    };
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({ testdate: moment('2012-03-12').valueOf() });
  });

  it('parse bsDate field yyyt: muvuku', () => {
    const doc = { message: '1!YYYT!12345#2068-11-29' };
    const def = definitions.forms.YYYT;
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({
      patient_id: '12345',
      lmp_date: moment('2012-03-12').valueOf()
    });
  });

  it('parse bsDate field yyyt 2: textforms', () => {
    const doc = { message: '12345 2068-11-29' };
    const def = definitions.forms.YYYT;
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({
      patient_id: '12345',
      lmp_date: moment('2012-03-12').valueOf()
    });
  });

  it('invalid bsDate field yyyt 2: textforms', () => {
    const doc = { message: '12345 2068-11-32' };
    const def = definitions.forms.YYYT;
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({ patient_id: '12345', lmp_date: null });
  });

  it('parse BS date parts yyys 2: textforms', () => {
    const doc = { message: '#ID 12345 #Y 2068 #M 11 #D 29' };
    const def = definitions.forms.YYYS;
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({
      patient_id: 12345,
      lmp_year: 2068, lmp_month: 11, lmp_day: 29,
      lmp_date: moment('2012-03-12').valueOf()
    });
  });

  it('parse BS date parts yyys 2: compact textforms', () => {
    const doc = { message: 'YYYS 12345 2068 11 29' };
    const def = definitions.forms.YYYS;
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({
      patient_id: '12345',
      lmp_year: '2068', lmp_month: '11', lmp_day: '29',
      lmp_date: moment('2012-03-12').valueOf()
    });
  });


  it('BS date parts with invalid bsYear yyys: compact textforms', () => {
    const doc = { message: 'YYYS 12345 123 11 29' };
    const def = definitions.forms.YYYS;
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({
      patient_id: '12345',
      lmp_year: '123', lmp_month: '11', lmp_day: '29',
      lmp_date: null
    });
  });

  it('BS date parts with missing bsYear yyys: compact textforms', () => {
    const doc = { message: 'YYYS 12345' };
    const def = definitions.forms.YYYS;
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({
      patient_id: '12345',
    });
  });


  it('BS date parts without bsMonth & bsDay yyyr: compact textforms', () => {
    const doc = { message: 'YYYR 12345 2068' };
    const def = definitions.forms.YYYR;
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({
      patient_id: '12345',
      lmp_year: '2068',
      lmp_date: moment('2011-04-14').valueOf() //2068-01-01 BS
    });
  });

  it('parse boolean field: true', () => {
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
    chai.expect(data).to.deep.equal({ testbool: true });
  });

  it('parse boolean field: false', () => {
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
    chai.expect(data).to.deep.equal({ testbool: false });
  });

  it('parse string field mixed: muvuku', () => {
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
    chai.expect(data).to.deep.equal({ foo: '16A' });
  });

  it('parse string field mixed: textforms', () => {
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
    chai.expect(data).to.deep.equal({ foo: '16A' });
  });

  it('parse string field with exlamation mark: textforms', () => {
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
    chai.expect(data).to.deep.equal({ foo: '16A!' });
  });

  it('parse string field with exlamation mark: muvuku', () => {
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
    chai.expect(data).to.deep.equal({ foo: '16A!' });
  });

  it('parse string field leading zero: textforms', () => {
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
    chai.expect(data).to.deep.equal({ foo: '012345' });
  });

  it('parse string field leading zero: muvuku', () => {
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
    chai.expect(data).to.deep.equal({ foo: '012345' });
  });

  it('smsformats unstructured', () => {
    const docs = [
      { message: 'testing one two three.' },
      { message: 'HELP ME' },
      { message: '' } // blank message
    ];
    docs.forEach(doc => {
      chai.expect(smsparser.parse(null, doc)).to.deep.equal({});
    });
  });

  it('smsformats structured but no form', () => {
    const docs = [
      { message: '1!0000!1' },
      { message: '0000 ABC 123-123-123' }
    ];
    docs.forEach(doc => {
      chai.expect(smsparser.parse(null, doc)).to.deep.equal({});
    });

  });

  it('smsformats textforms only one field', () => {
    const doc = { message: 'YYYY CDT33' };
    const data = smsparser.parse(definitions.forms.YYYY, doc);
    chai.expect(data).to.deep.equal({
      quantity_dispensed: {
        cotrimoxazole: 33,
      }
    });
  });

  it('valid muvuku message', () => {
    const def = definitions.forms.YYYY;
    const doc = {
      sent_timestamp: '12-11-11 15:00',
      from: '+15551212',
      message: '1!YYYY!facility#2011#11#0#1#2#3#4#5#6#9#8#7#6#5#4'
    };
    const actual = smsparser.parse(def, doc);
    chai.expect(actual).to.deep.equal({
      facility_id: 'facility',
      year: 2011,
      month: 'November',
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
    chai.expect(arr).to.deep.equal(
      ['12-11-11 15:00', '+15551212', 'facility', '2011', '11',
        '0', '1', '2', '3', '4', '5', '6', '9', '8', '7', '6', '5', '4']
    );
  });

  it('valid javarosa message', () => {
    const def = definitions.forms.YYYY;
    const doc = {
      sent_timestamp: '12-11-11 15:00',
      from: '+15551212',
      message: 'J1!YYYY!HFI#facility#RPY#2011#RPM#11#MSP#0#L1T#1#L2T#2#CDT#3#ZDT#4#ODT#5#EOT#6#L1O#9#' +
        'L2O#8#CDO#7#ZDO#6#ODO#5#EDO#4'
    };
    const actual = smsparser.parse(def, doc);
    chai.expect(actual).to.deep.equal({
      facility_id: 'facility',
      year: 2011,
      month: 'November',
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
    chai.expect(arr).to.deep.equal(
      ['12-11-11 15:00', '+15551212', 'facility', '2011', '11',
        '0', '1', '2', '3', '4', '5', '6', '9', '8', '7', '6', '5', '4']
    );
  });

  it('valid javarosa message, random field ordering', () => {
    const def = definitions.forms.YYYY;
    const doc = {
      sent_timestamp: '12-11-11 15:00',
      from: '+15551212',
      message: 'J1!YYYY!EDO#4#ODT#5#RPM#11#L2T#2#HFI#facility#CDT#3#CDO#7#MSP#0#ZDO#6#L1O#9#RPY#2011#EOT#6#ODO#' +
        '5#L1T#1#ZDT#4#L2O#8'
    };
    const actual = smsparser.parse(def, doc);
    chai.expect(actual).to.deep.equal({
      facility_id: 'facility',
      year: 2011,
      month: 'November',
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
    chai.expect(arr).to.deep.equal(
      ['12-11-11 15:00', '+15551212', 'facility', '2011', '11',
        '0', '1', '2', '3', '4', '5', '6', '9', '8', '7', '6', '5', '4']
    );
  });

  it('valid javarosa message, fields missing', () => {
    const def = definitions.forms.YYYY;
    const doc = {
      sent_timestamp: '12-11-11 15:00',
      from: '+15551212',
      message: 'J1!YYYY!EDO#4#ODT#5#RPM#11#L2T#2#HFI#facility#CDT#3#CDO#7#MSP#0#ZDO#6#L1O#9#RPY#2011#EOT#6'
    };
    const actual = smsparser.parse(def, doc);
    chai.expect(actual).to.deep.equal({
      facility_id: 'facility',
      year: 2011,
      month: 'November',
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
    chai.expect(arr).to.deep.equal(
      ['12-11-11 15:00', '+15551212', 'facility', '2011', '11', '0', undefined, '2', '3', undefined,
        '5', '6', '9', undefined, '7', '6', undefined, '4']
    );
  });

  it('valid javarosa message, values contain escaped delimiters', () => {
    const def = definitions.forms.YYYY;
    const doc = {
      sent_timestamp: '12-11-11 15:00',
      from: '+15551212',
      message: 'J1!YYYY!L2T#2#HFI#fa\\cility\\#2\\#3#CDT#3#CDO#7'
    };
    const actual = smsparser.parse(def, doc);
    chai.expect(actual).to.deep.equal({
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
    chai.expect(arr).to.deep.equal(
      ['12-11-11 15:00', '+15551212', 'fa\\cility#2#3', undefined, undefined, undefined, undefined,
        '2', '3', undefined, undefined, undefined, undefined, undefined, '7', undefined, undefined, undefined]
    );
  });

  it('parse javarosa message with special characters in a value', () => {
    const def = definitions.forms.YYYY;
    const doc = {
      sent_timestamp: '12-11-11 15:00',
      from: '+15551212',
      message: 'J1!YYYY!HFI#!fac*!?ty!#RPY#2015'
    };
    const obj = smsparser.parse(def, doc);
    chai.expect(obj.facility_id).to.equal('!fac*!?ty!');
    chai.expect(obj.year).to.equal(2015);
  });

  it('valid javarosa message with similarly named fields parses right', () => {
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
    chai.expect(obj).to.deep.equal({
      problem: 'Bar',
      meta_problem: 'foo'
    });
    const arr = smsparser.parseArray(def, doc);
    chai.expect(arr).to.deep.equal(
      ['12-11-11 15:00', '+15551212', 'Bar', 'foo']
    );
  });

  it('valid javarosa message with space in label parses right', () => {
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
    chai.expect(obj).to.deep.equal({
      problem: 'Bar',
      meta_problem: 'foo'
    });
    const arr = smsparser.parseArray(def, doc);
    chai.expect(arr).to.deep.equal(
      ['12-11-11 15:00', '+15551212', 'Bar', 'foo']
    );
  });

  it('handles unmatched labels', () => {
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
    chai.expect(obj).to.deep.equal({
      one: 'two',
      odd: undefined
    });
  });

  it('junk example data', () => {
    const doc = {
      sent_timestamp: '2-1-12 15:35',
      from: '+13125551212',
      message: 'xox+o123'
    };
    const obj = smsparser.parse(null, doc);
    const expectedObj = {};
    chai.expect(obj).to.deep.equal(expectedObj);
    const arr = smsparser.parseArray(null, doc);
    const expectedArr = [];
    chai.expect(arr).to.deep.equal(expectedArr);
  });

  it('one field input is parsed correctly', () => {
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
            tiny: { en: 'ID' },
            description: { en: 'Patient Identifier' },
            short: { en: 'Patient ID' }
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
          length: [3, 100],
          type: 'string'
        }
      }
    };
    const id = 12345;
    const doc = { message: 'OFF ID ' + id, locale: 'en' };
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({ patient_id: id });
  });

  it('non ascii code is accepted', () => {
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
    chai.expect(data).to.deep.equal({ foo: '16A' });

    // compact
    doc = { message: 'ग 16A' };
    data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({ foo: '16A' });

    // muvuku
    doc = { message: '1!ग!16A' };
    data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({ foo: '16A' });
  });

  it('support textforms locale on tiny labels', () => {

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
    chai.expect(data).to.deep.equal({ name: 'n jane' });

    // textforms with locale match parses correctly
    doc = {
      message: 'R j jane',
      locale: 'sw'
    };
    data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({ name: 'jane' });

    // same thing but case insensitive check
    doc = {
      message: 'r J jane',
      locale: 'sw'
    };
    data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({ name: 'jane' });

    // compact parses correctly
    doc = {
      message: 'R jane'
    };
    data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({ name: 'jane' });

    // muvuku parses correctly
    doc = {
      message: '1!R!jane'
    };
    data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({ name: 'jane' });
  });

  it('support translation keys on tiny labels', () => {

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
    chai.expect(data).to.deep.equal({ name: 'jane' });

    // same thing but case insensitive check
    doc = {
      message: 'r J jane',
      locale: 'sw'
    };
    data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({ name: 'jane' });

    // compact parses correctly
    doc = {
      message: 'R jane'
    };
    data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({ name: 'jane' });

    // muvuku parses correctly
    doc = {
      message: '1!R!jane'
    };
    data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({ name: 'jane' });
  });

  it('support mixed case field keys', () => {

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
    chai.expect(data).to.deep.equal({ ooOoo: 'jane' });

    // compact textforms
    doc = {
      message: 'R jane'
    };
    data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({ ooOoo: 'jane' });

    // muvuku
    doc = {
      message: '1!R!jane'
    };
    data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({ ooOoo: 'jane' });
  });

  it('support uppercase field keys', () => {

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
    chai.expect(data).to.deep.equal({ OOOOO: 'jane' });

    // compact textforms
    doc = {
      message: 'R jane'
    };
    data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({ OOOOO: 'jane' });

    // muvuku
    doc = {
      message: '1!R!jane'
    };
    data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({ OOOOO: 'jane' });
  });

  it('support regex chars in form code, parser escapes them', () => {
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
    chai.expect(data).to.deep.equal({ name: 'jane' });
  });

  it('stop input values from getting translated', () => {
    const def = {
      meta: {
        code: 'c_imm'
      },
      fields: {
        bcg: {
          type: 'string',
          labels: {
            tiny: 'bcg'
          }
        },
        ch: {
          type: 'string',
          labels: {
            tiny: 'ch'
          }
        }
      }
    };
    sinon.stub(config, 'translate')
      .withArgs('bcg').returns('bcg')
      .withArgs('ch').returns('ch')
      .withArgs('no').returns('no')
      .withArgs('yes').returns('yes');
    const doc = {
      message: 'J1!c_imm!bcg#yes#ch#no'
    };
    const data = smsparser.parse(def, doc);
    chai.expect(data).to.deep.equal({ bcg: 'yes', ch: 'no' });
    chai.expect(config.translate.callCount).to.equal(2);
  });

});
