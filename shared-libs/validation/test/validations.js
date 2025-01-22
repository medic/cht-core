const moment = require('moment');
const sinon = require('sinon');
const assert = require('chai').assert;
const validation = require('../src/validation');
const logger = require('@medic/logger');
const { Qualifier, Report } = require('@medic/cht-datasource');

let clock;
let db;
let config;
let translate;
let dataContext;

const stubMe = (functionName) => {
  logger.error(new Error(
    `db.${functionName}() not stubbed!` +
    `Please stub PouchDB functions that will be interacted with in unit tests.`
  ));
  process.exit(1);
};

describe('validations', () => {
  let reportGetUuids;
  let qualifier;

  beforeEach(() => {
    db = { medic: { query: () => stubMe('query'), allDocs: () => stubMe('allDocs') } };
    dataContext = { bind: sinon.stub() };
    config = {};
    translate = sinon.stub().returnsArg(0);
    sinon.stub(logger, 'debug');
    sinon.stub(logger, 'error');

    reportGetUuids = sinon.stub();
    dataContext.bind.returns(reportGetUuids);
    qualifier = sinon.stub(Qualifier, 'byFreetext');

    validation.init({ db, config, translate, dataContext });
  });

  afterEach(() => {
    if (clock) {
      clock.restore();
    }
    sinon.restore();
  });

  it('validate handles pupil parse errors', () => {
    const doc = {
      phone: '123',
    };
    const validations = [
      {
        property: 'phone',
        rule: 'regex(bad no quotes)',
      },
    ];
    return validation.validate(doc, validations).then(errors => {
      assert.deepEqual(errors, [
        'Error on pupil validations: {"message":"Unexpected identifier","pos":2}',
      ]);
    });
  });

  it('validate handles pupil regex', () => {
    const validations = [
      {
        property: 'phone',
        rule: 'regex("^\\d+$")',
        message: [
          {
            content: 'Invalid phone {{phone}}.',
            locale: 'en',
          },
        ],
      },
    ];
    return Promise
      .all([
        validation.validate({ phone: '123' }, validations),
        validation.validate({ phone: '123a' }, validations),
      ])
      .then((errors) => {
        assert.deepEqual(errors[0], []);
        assert.deepEqual(errors[1], [
          {
            code: 'invalid_phone',
            message: 'Invalid phone {{phone}}.',
          },
        ]);
      });
  });

  it('pass unique validation when no doc found for text without spaces', () => {
    const freetext = 'patient_id:111';
    qualifier.returns({ freetext });
    const mockGeneratorL = async function* () {
    };
    reportGetUuids.resolves(mockGeneratorL);
    const validations = [
      {
        property: 'patient_id',
        rule: 'unique("patient_id")',
      },
    ];
    const doc = {
      _id: 'same',
      patient_id: '111',
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(errors.length, 0);
      assert.equal(dataContext.bind.callCount, 1);
      assert.equal(dataContext.bind.args[0][0], Report.v1.getUuids);
      assert.equal(qualifier.callCount, 1);
      assert.equal(qualifier.args[0][0], freetext);
      assert.equal(reportGetUuids.callCount, 1);
      assert.deepEqual(reportGetUuids.args[0][0], { freetext });
    });
  });

  it('pass unique validation when no doc found for text with spaces', () => {
    const view = sinon.stub(db.medic, 'query').resolves({ rows: [] });
    const validations = [
      {
        property: 'patient_id',
        rule: 'unique("patient_id")',
      },
    ];
    const doc = {
      _id: 'same',
      patient_id: '111 222',
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(view.callCount, 1);
      assert.equal(view.args[0][0], 'medic-client/reports_by_freetext');
      assert.deepEqual(view.args[0][1], { key: ['patient_id:111 222'] });
      assert.equal(errors.length, 0);
    });
  });

  it('pass unique validation when doc is the same for field value without spaces', () => {
    const freetext = 'patient_id:111';
    qualifier.returns({ freetext });
    const mockGeneratorL = async function* () {
      yield 'same';
    };
    reportGetUuids.resolves(mockGeneratorL);
    const validations = [
      {
        property: 'patient_id',
        rule: 'unique("patient_id")',
      },
    ];
    const doc = {
      _id: 'same',
      patient_id: '111',
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(dataContext.bind.callCount, 1);
      assert.equal(dataContext.bind.args[0][0], Report.v1.getUuids);
      assert.equal(qualifier.callCount, 1);
      assert.equal(qualifier.args[0][0], freetext);
      assert.equal(reportGetUuids.callCount, 1);
      assert.deepEqual(reportGetUuids.args[0][0], { freetext });
      assert.equal(errors.length, 0);
    });
  });

  it('pass unique validation when doc is the same for field value with spaces', () => {
    const view = sinon.stub(db.medic, 'query').resolves({
      rows: [
        {
          id: 'same',
          doc: { _id: 'same', errors: [] },
        },
      ],
    });
    const validations = [
      {
        property: 'patient_id',
        rule: 'unique("patient_id")',
      },
    ];
    const doc = {
      _id: 'same',
      patient_id: '111 222',
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(view.callCount, 1);
      assert.equal(view.args[0][0], 'medic-client/reports_by_freetext');
      assert.deepEqual(view.args[0][1], { key: ['patient_id:111 222'] });
      assert.equal(errors.length, 0);
    });
  });

  it('pass unique validation when doc has errors for field value without spaces', () => {
    const freetext = 'patient_id:111';
    qualifier.returns({ freetext });
    const mockGeneratorL = async function* () {
      yield 'different';
    };
    reportGetUuids.resolves(mockGeneratorL);
    const allDocs = sinon.stub(db.medic, 'allDocs').resolves({
      rows: [
        {
          id: 'different',
          doc: { errors: [{ foo: 'bar' }] },
        },
      ],
    });
    const validations = [
      {
        property: 'patient_id',
        rule: 'unique("patient_id")',
      },
    ];
    const doc = {
      _id: 'same',
      patient_id: '111',
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(logger.error.callCount, 0);
      assert.equal(dataContext.bind.callCount, 1);
      assert.equal(dataContext.bind.args[0][0], Report.v1.getUuids);
      assert.equal(qualifier.callCount, 1);
      assert.equal(qualifier.args[0][0], freetext);
      assert.equal(reportGetUuids.callCount, 1);
      assert.deepEqual(reportGetUuids.args[0][0], { freetext });
      assert.equal(allDocs.callCount, 1);
      assert.deepEqual(allDocs.args[0][0], { keys: ['different'], include_docs: true });
      assert.equal(errors.length, 0);
    });
  });

  it('pass unique validation when doc has errors for field value with spaces', () => {
    const view = sinon.stub(db.medic, 'query').resolves({
      rows: [{ id: 'different' }],
    });
    const allDocs = sinon.stub(db.medic, 'allDocs').resolves({
      rows: [
        {
          id: 'different',
          doc: { errors: [{ foo: 'bar' }] },
        },
      ],
    });
    const validations = [
      {
        property: 'patient_id',
        rule: 'unique("patient_id")',
      },
    ];
    const doc = {
      _id: 'same',
      patient_id: '111 222',
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(logger.error.callCount, 0);
      assert.equal(view.callCount, 1);
      assert.equal(view.args[0][0], 'medic-client/reports_by_freetext');
      assert.deepEqual(view.args[0][1], { key: ['patient_id:111 222'] });
      assert.equal(allDocs.callCount, 1);
      assert.deepEqual(allDocs.args[0][0], { keys: ['different'], include_docs: true });
      assert.equal(errors.length, 0);
    });
  });

  it('fail unique validation on doc with no errors', () => {
    sinon.stub(db.medic, 'query').resolves({
      rows: [{ id: 'different' }],
    });
    sinon.stub(db.medic, 'allDocs').resolves({
      rows: [
        {
          id: 'different',
          doc: { _id: 'different', errors: [] },
        },
      ],
    });
    const validations = [
      {
        property: 'xyz',
        rule: 'unique("xyz")',
        message: [
          {
            content: 'Duplicate: {{xyz}}.',
            locale: 'en',
          },
        ],
      },
    ];
    const doc = {
      _id: 'same',
      xyz: '444',
    };
    return validation.validate(doc, validations).then(errors => {
      assert.deepEqual(errors, [
        {
          code: 'invalid_xyz',
          message: 'Duplicate: {{xyz}}.',
        },
      ]);
    });
  });

  it('fail multiple field unique validation on doc with field values without spaces with no errors', () => {
    const freetext1 = 'xyz:444';
    const freetext2 = 'abc:cheese';
    qualifier
      .onCall(0).returns({ freetext: freetext1 })
      .onCall(1).returns({ freetext: freetext2 });
    const mockGenerator = async function* () {
      yield 'different';
    };
    reportGetUuids.resolves(mockGenerator);
    const allDocs = sinon.stub(db.medic, 'allDocs').resolves({
      rows: [
        {
          id: 'different',
          doc: { _id: 'different', errors: [] },
        },
      ],
    });
    const validations = [
      {
        property: 'xyz',
        rule: 'unique("xyz","abc")',
        message: [
          {
            content: 'Duplicate xyz {{xyz}} and abc {{abc}}.',
            locale: 'en',
          },
        ],
      },
    ];
    const doc = {
      _id: 'same',
      xyz: '444',
      abc: 'CHeeSE', // value is lowercased as it is in the view map definition
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(dataContext.bind.callCount, 2);
      assert.equal(dataContext.bind.args[0][0], Report.v1.getUuids);
      assert.equal(dataContext.bind.args[1][0], Report.v1.getUuids);
      assert.equal(qualifier.callCount, 2);
      assert.equal(qualifier.args[0][0], freetext1);
      assert.equal(qualifier.args[1][0], freetext2);
      assert.equal(reportGetUuids.callCount, 2);
      assert.deepEqual(reportGetUuids.args[0][0], { freetext: freetext1 });
      assert.deepEqual(reportGetUuids.args[1][0], { freetext: freetext2 });
      assert.equal(allDocs.callCount, 1);
      assert.deepEqual(allDocs.args[0][0], { keys: ['different'], include_docs: true });
      assert.deepEqual(errors, [
        {
          code: 'invalid_xyz',
          message: 'Duplicate xyz {{xyz}} and abc {{abc}}.',
        },
      ]);
    });
  });

  it('fail multiple field unique validation on doc with field values with spaces with no errors', () => {
    const view = sinon.stub(db.medic, 'query').resolves({
      rows: [{ id: 'different' }],
    });
    const allDocs = sinon.stub(db.medic, 'allDocs').resolves({
      rows: [
        {
          id: 'different',
          doc: { _id: 'different', errors: [] },
        },
      ],
    });
    const validations = [
      {
        property: 'xyz',
        rule: 'unique("xyz","abc")',
        message: [
          {
            content: 'Duplicate xyz {{xyz}} and abc {{abc}}.',
            locale: 'en',
          },
        ],
      },
    ];
    const doc = {
      _id: 'same',
      xyz: '444 555',
      abc: 'CHeeSE BuRgEr', // value is lowercased as it is in the view map definition
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(view.callCount, 2);
      assert.equal(view.args[0][0], 'medic-client/reports_by_freetext');
      assert.deepEqual(view.args[0][1], { key: ['xyz:444 555'] });
      assert.equal(view.args[1][0], 'medic-client/reports_by_freetext');
      assert.deepEqual(view.args[1][1], { key: ['abc:cheese burger'] });
      assert.equal(allDocs.callCount, 1);
      assert.deepEqual(allDocs.args[0][0], { keys: ['different'], include_docs: true });
      assert.deepEqual(errors, [
        {
          code: 'invalid_xyz',
          message: 'Duplicate xyz {{xyz}} and abc {{abc}}.',
        },
      ]);
    });
  });

  it('unique phone validation should fail if db query for phone returns doc', () => {
    sinon.stub(db.medic, 'query').resolves({
      rows: [
        {
          id: 'original',
          phone: '+9779841111111'
        }
      ]
    });
    const validations = [
      {
        property: 'phone_number',
        rule: 'uniquePhone("phone_number")',
        message: [
          {
            content: 'Duplicate phone',
            locale: 'en',
          },
        ],
      },
    ];
    const doc = {
      _id: 'duplicate',
      xyz: '+9779841111111',
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(errors.length, 1);
    });
  });


  it('phone validation should fail if invalid phone is provided', () => {
    const config = require('../../transitions/src/config');
    
    const mockedGetAll = sinon.stub().returns({
      default_country_code: 977,
      phone_validation: 'full'
    });

    config.getAll = mockedGetAll;

    const validations = [
      {
        property: 'phone_number',
        rule: 'validPhone("phone_number")',
        message: [
          {
            content: 'invalid phone',
            locale: 'en',
          },
        ],
      },
    ];
    const doc = {
      _id: 'invalid',
      fields: { phone_number: '+977984111'}
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(errors.length, 1);
    });
  });

  it('phone validation should pass if valid phone is provided', () => {
    const config = require('../../transitions/src/config');

    const mockedGetAll = sinon.stub().returns({
      default_country_code: 977,
      phone_validation: 'full'
    });

    config.getAll = mockedGetAll;

    const validations = [
      {
        property: 'phone_number',
        rule: 'validPhone("phone_number")',
        message: [
          {
            content: 'invalid phone',
            locale: 'en',
          },
        ],
      },
    ];
    const doc = {
      _id: 'invalid',
      fields: { phone_number: '9841134532' }
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(errors.length, 0);
    });
  });

  it('phone validation should pass if valid phone with country code is provided', () => {
    const config = require('../../transitions/src/config');

    const mockedGetAll = sinon.stub().returns({
      default_country_code: 977,
      phone_validation: 'full'
    });

    config.getAll = mockedGetAll;

    const validations = [
      {
        property: 'phone_number',
        rule: 'validPhone("phone_number")',
        message: [
          {
            content: 'invalid phone',
            locale: 'en',
          },
        ],
      },
    ];
    const doc = {
      _id: 'invalid',
      fields: { phone_number: '+9779841134532' }
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(errors.length, 0);
    });
  });

  it('phone validation should fail if alphabets in phone number', () => {
    const config = require('../../transitions/src/config');

    const mockedGetAll = sinon.stub().returns({
      default_country_code: 977,
      phone_validation: 'full'
    });

    config.getAll = mockedGetAll;

    const validations = [
      {
        property: 'phone_number',
        rule: 'validPhone("phone_number")',
        message: [
          {
            content: 'invalid phone',
            locale: 'en',
          },
        ],
      },
    ];
    const doc = {
      _id: 'invalid',
      fields: { phone_number: '+97798A1134532' }
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(errors.length, 1);
    });
  });

  it('unique phone validation should pass if db query for phone does not return any doc', () => {
    sinon.stub(db.medic, 'query').resolves({ undefined });
    const validations = [
      {
        property: 'phone_number',
        rule: 'uniquePhone("phone_number")',
        message: [
          {
            content: 'unique phone',
            locale: 'en',
          },
        ],
      },
    ];
    const doc = {
      _id: 'unique',
      xyz: '+9779841111111',
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(errors.length, 0);
    });
  });

  it('pass uniqueWithin validation on old doc with field values without spaces', () => {
    clock = sinon.useFakeTimers();
    const freetext = 'xyz:444';
    qualifier.returns({ freetext });
    const mockGenerator = async function* () {
      yield 'different';
    };
    reportGetUuids.resolves(mockGenerator);
    sinon.stub(db.medic, 'allDocs').resolves({
      rows: [
        {
          id: 'different',
          doc: {
            _id: 'different',
            errors: [],
            reported_date: moment()
              .subtract(3, 'weeks')
              .valueOf(),
          },
        },
      ],
    });
    const validations = [
      {
        property: 'xyz',
        rule: 'uniqueWithin("xyz","2 weeks")',
        message: [
          {
            content: 'Duplicate xyz {{xyz}}.',
            locale: 'en',
          },
        ],
      },
    ];
    const doc = {
      _id: 'same',
      xyz: '444',
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(errors.length, 0);
      assert.equal(dataContext.bind.callCount, 1);
      assert.equal(dataContext.bind.args[0][0], Report.v1.getUuids);
      assert.equal(qualifier.callCount, 1);
      assert.equal(qualifier.args[0][0], freetext);
      assert.equal(reportGetUuids.callCount, 1);
      assert.deepEqual(reportGetUuids.args[0][0], { freetext });
    });
  });

  it('pass uniqueWithin validation on old doc with field values with spaces', () => {
    clock = sinon.useFakeTimers();
    sinon.stub(db.medic, 'query').resolves({
      rows: [{ id: 'different' }],
    });
    sinon.stub(db.medic, 'allDocs').resolves({
      rows: [
        {
          id: 'different',
          doc: {
            _id: 'different',
            errors: [],
            reported_date: moment()
              .subtract(3, 'weeks')
              .valueOf(),
          },
        },
      ],
    });
    const validations = [
      {
        property: 'xyz',
        rule: 'uniqueWithin("xyz","2 weeks")',
        message: [
          {
            content: 'Duplicate xyz {{xyz}}.',
            locale: 'en',
          },
        ],
      },
    ];
    const doc = {
      _id: 'same',
      xyz: '444 555',
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(errors.length, 0);
    });
  });

  it('fail uniqueWithin validation on new doc', () => {
    clock = sinon.useFakeTimers();
    sinon.stub(db.medic, 'query').resolves({
      rows: [{ id: 'different1' }, { id: 'different2' }, { id: 'different3' }],
    });
    // rows are sorted based on uuid not on date, so we have to check all docs
    sinon.stub(db.medic, 'allDocs').resolves({
      rows: [
        {
          id: 'different1',
          doc: {
            _id: 'different1',
            errors: [],
            reported_date: moment()
              .subtract(3, 'weeks')
              .valueOf(),
          },
        },
        {
          id: 'different2',
          doc: {
            _id: 'different2',
            errors: [],
            reported_date: moment()
              .subtract(1, 'weeks')
              .valueOf(),
          },
        },
        {
          id: 'different3',
          doc: {
            _id: 'different3',
            errors: [],
            reported_date: moment()
              .subtract(10, 'weeks')
              .valueOf(),
          },
        },
      ],
    });
    const validations = [
      {
        property: 'xyz',
        rule: 'uniqueWithin("xyz","2 weeks")',
        message: [
          {
            content: 'Duplicate xyz {{xyz}}.',
            locale: 'en',
          },
        ],
      },
    ];
    const doc = {
      _id: 'same',
      xyz: '444',
    };
    return validation.validate(doc, validations).then(errors => {
      assert.deepEqual(errors, [
        {
          code: 'invalid_xyz',
          message: 'Duplicate xyz {{xyz}}.',
        },
      ]);
    });
  });

  it('pass isISOWeek validation on doc', () => {
    const validations = [
      {
        property: 'week',
        rule: 'isISOWeek("week", "year")',
      },
    ];
    const doc = {
      _id: 'same',
      week: 32,
      year: 2016,
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(errors.length, 0);
    });
  });

  it('pass isISOWeek validation on doc when no year field is provided', () => {
    const validations = [
      {
        property: 'week',
        rule: 'isISOWeek("week")',
      },
    ];
    const doc = {
      _id: 'same',
      week: 32,
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(errors.length, 0);
    });
  });

  it('fail isISOWeek validation on doc', () => {
    const validations = [
      {
        property: 'week',
        rule: 'isISOWeek("week", "year")',
      },
    ];
    const doc = {
      _id: 'same',
      week: 55,
      year: 2016,
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(errors.length, 1);
    });
  });

  it('fail isISOWeek validation on doc when no year field is provided', () => {
    const validations = [
      {
        property: 'week',
        rule: 'isISOWeek("week")',
      },
    ];
    const doc = {
      _id: 'same',
      week: 65,
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(errors.length, 1);
    });
  });

  it('pass exists validation when matching document with field values without spaces', () => {
    const freetext1 = 'patient_id:444';
    const freetext2 = 'form:registration';
    qualifier
      .onCall(0).returns({ freetext: freetext1 })
      .onCall(1).returns({ freetext: freetext2 });
    const mockGenerator = async function* () {
      yield 'different';
    };
    reportGetUuids.resolves(mockGenerator);
    sinon.stub(db.medic, 'allDocs').resolves({
      rows: [
        {
          id: 'different',
          doc: { _id: 'different', errors: [] },
        },
      ],
    });
    const validations = [
      {
        property: 'parent_id',
        rule: 'exists("REGISTRATION", "patient_id")',
        message: [
          {
            content: 'Unknown patient {{parent_id}}.',
            locale: 'en',
          },
        ],
      },
    ];
    const doc = {
      _id: 'same',
      patient_id: '444',
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(dataContext.bind.callCount, 2);
      assert.equal(dataContext.bind.args[0][0], Report.v1.getUuids);
      assert.equal(dataContext.bind.args[1][0], Report.v1.getUuids);
      assert.equal(qualifier.callCount, 2);
      assert.equal(qualifier.args[0][0], freetext1);
      assert.equal(qualifier.args[1][0], freetext2);
      assert.equal(reportGetUuids.callCount, 2);
      assert.deepEqual(reportGetUuids.args[0][0], { freetext: freetext1 });
      assert.deepEqual(reportGetUuids.args[1][0], { freetext: freetext2 });
      assert.deepEqual(errors, []);
    });
  });

  it('pass exists validation when matching document with field values with spaces', () => {
    const freetext = 'form:registration';
    const view = sinon.stub(db.medic, 'query').resolves({
      rows: [{ id: 'different' }],
    });
    const mockGenerator = async function* () {
      yield 'different';
    };
    reportGetUuids.resolves(mockGenerator); // once for form=REGISTRATION
    qualifier.returns({ freetext });
    sinon.stub(db.medic, 'allDocs').resolves({
      rows: [
        {
          id: 'different',
          doc: { _id: 'different', errors: [] },
        },
      ],
    });
    const validations = [
      {
        property: 'parent_id',
        rule: 'exists("REGISTRATION", "patient_id")',
        message: [
          {
            content: 'Unknown patient {{parent_id}}.',
            locale: 'en',
          },
        ],
      },
    ];
    const doc = {
      _id: 'same',
      patient_id: '444 555',
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(view.callCount, 1);
      assert.equal(view.args[0][0], 'medic-client/reports_by_freetext');
      assert.deepEqual(view.args[0][1], { key: ['patient_id:444 555'] });
      assert.equal(dataContext.bind.callCount, 1);
      assert.equal(dataContext.bind.args[0][0], Report.v1.getUuids);
      assert.equal(qualifier.callCount, 1);
      assert.equal(qualifier.args[0][0], freetext);
      assert.equal(reportGetUuids.callCount, 1);
      assert.deepEqual(reportGetUuids.args[0][0], { freetext });
      assert.deepEqual(errors, []);
    });
  });

  it('fail exists validation when no matching document', () => {
    sinon.stub(db.medic, 'query').resolves({
      rows: [],
    });
    const validations = [
      {
        property: 'parent_id',
        rule: 'exists("REGISTRATION", "patient_id")',
        message: [
          {
            content: 'Unknown patient {{parent_id}}.',
            locale: 'en',
          },
        ],
      },
    ];
    const doc = {
      _id: 'same',
      parent_id: '444',
    };
    return validation.validate(doc, validations).then(errors => {
      assert.deepEqual(errors, [
        {
          code: 'invalid_parent_id',
          message: 'Unknown patient {{parent_id}}.',
        },
      ]);
    });
  });

  it('fail exists validation when matching document is same as this', () => {
    sinon.stub(db.medic, 'query').resolves({
      rows: [
        {
          id: 'same',
          doc: { _id: 'same', errors: [] },
        },
      ],
    });
    const validations = [
      {
        property: 'parent_id',
        rule: 'exists("REGISTRATION", "patient_id")',
        message: [
          {
            content: 'Unknown patient {{parent_id}}.',
            locale: 'en',
          },
        ],
      },
    ];
    const doc = {
      _id: 'same',
      parent_id: '444',
    };
    return validation.validate(doc, validations).then(errors => {
      assert.deepEqual(errors, [
        {
          code: 'invalid_parent_id',
          message: 'Unknown patient {{parent_id}}.',
        },
      ]);
    });
  });

  it('pass isBefore validation on doc when test date is 1 day before control date', () => {
    const validations = [
      {
        property: 'lmp_date',
        rule: 'isBefore("4 weeks")',
      },
    ];
    const doc = {
      _id: 'same',
      lmp_date: moment().subtract({ weeks: 4, days: 1 }).valueOf(),
      reported_date: moment().valueOf()
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(errors.length, 0);
    });
  });

  it('pass isBefore validation on doc when lmp_date is a field', () => {
    const validations = [
      {
        property: 'lmp_date',
        rule: 'isBefore("4 weeks")',
      },
    ];
    const doc = {
      _id: 'same',
      fields: {
        lmp_date: moment().subtract({ weeks: 4, days: 1 }).valueOf()
      },
      reported_date: moment().valueOf()
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(errors.length, 0);
    });
  });

  it('pass isBefore validation on doc when the test and control dates are same', () => {
    const validations = [
      {
        property: 'lmp_date',
        rule: 'isBefore("4 weeks")',
      },
    ];
    const doc = {
      _id: 'same',
      lmp_date: moment().subtract({ weeks: 4 }).valueOf(),
      reported_date: moment().valueOf()
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(errors.length, 0);
    });
  });

  it('fail isBefore validation when test date is 1 day later than control date', () => {
    const validations = [
      {
        property: 'lmp_date',
        rule: 'isBefore("4 weeks")',
        message: [
          {
            content: 'Invalid date.',
            locale: 'en',
          },
        ],
      },
    ];
    const doc = {
      _id: 'same',
      lmp_date: moment().subtract({ weeks: 3, days: 6 }).valueOf(),
      reported_date: moment().valueOf()
    };
    return validation.validate(doc, validations).then(errors => {
      assert.deepEqual(errors, [
        {
          code: 'invalid_lmp_date',
          message: 'Invalid date.',
        },
      ]);
    });
  });

  it('fail isBefore validation when test date is not a valid date', () => {
    const validations = [
      {
        property: 'lmp_date',
        rule: 'isBefore("4 weeks")',
        message: [
          {
            content: 'Invalid date.',
            locale: 'en',
          },
        ],
      },
    ];
    const doc = {
      _id: 'same',
      lmp_date: 'x',
      reported_date: moment().valueOf()
    };
    return validation.validate(doc, validations).then(errors => {
      assert.deepEqual(errors, [
        {
          code: 'invalid_lmp_date',
          message: 'Invalid date.',
        },
      ]);
    });
  });

  it('fail isBefore validation when duration is not a number', () => {
    const validations = [
      {
        property: 'lmp_date',
        rule: 'isBefore("x")',
        message: [
          {
            content: 'Invalid date.',
            locale: 'en',
          },
        ],
      },
    ];
    const doc = {
      _id: 'same',
      lmp_date: moment().subtract({ weeks: 3, days: 6 }).valueOf(),
      reported_date: moment().valueOf()
    };
    return validation.validate(doc, validations).then(errors => {
      assert.deepEqual(errors, [
        {
          code: 'invalid_lmp_date',
          message: 'Invalid date.',
        },
      ]);
    });
  });

  it('pass isAfter validation on doc when test date is 1 day after control date', () => {
    const validations = [
      {
        property: 'lmp_date',
        rule: 'isAfter("-40 weeks")',
      },
    ];
    const doc = {
      _id: 'same',
      lmp_date: moment().subtract({ weeks: 39, days: 6 }).valueOf(),
      reported_date: moment().valueOf()
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(errors.length, 0);
    });
  });

  it('pass isAfter validation on doc when the test and control dates are same', () => {
    const validations = [
      {
        property: 'lmp_date',
        rule: 'isAfter("-40 weeks")',
      },
    ];
    const doc = {
      _id: 'same',
      lmp_date: moment().subtract({ weeks: 40 }).valueOf(),
      reported_date: moment().valueOf()
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(errors.length, 0);
    });
  });

  it('fail isAfter validation when test date is 1 day before control date', () => {
    const validations = [
      {
        property: 'lmp_date',
        rule: 'isAfter("-40 weeks")',
        message: [
          {
            content: 'Invalid date.',
            locale: 'en',
          },
        ],
      },
    ];
    const doc = {
      _id: 'same',
      lmp_date: moment().subtract({ weeks: 40, days: 1 }).valueOf(),
      reported_date: moment().valueOf()
    };
    return validation.validate(doc, validations).then(errors => {
      assert.deepEqual(errors, [
        {
          code: 'invalid_lmp_date',
          message: 'Invalid date.',
        },
      ]);
    });
  });

  describe('"other" prefix', () => {
    const validations = [
      {
        property: 'state',
        rule: 'otherEquals("country", "US") ? lenMin(2) : lenMin(0)',
        message: [
          {
            content: 'Invalid state.',
            locale: 'en',
          },
        ],
      },
    ];

    const VALID_US = {
      name: 'valid state for US',
      valid: true, 
      doc: { _id: 'same', state: 'CA', country: 'US' }
    };

    const INVALID_US = {
      name: 'invalid state for US',
      valid: false, 
      doc: { _id: 'same', state: 'O', country: 'US' }
    };

    const VALID_NZ = {
      name: 'ignore state for NZ',
      valid: true, 
      doc: { _id: 'same', state: 'O', country: 'NZ' }
    };

    [ VALID_US, INVALID_US, VALID_NZ ].forEach(({ name, valid, doc }) => {
      it(name, () => {
        return validation.validate(doc, validations).then(errors => {
          if (valid) {
            assert.equal(errors.length, 0);
          } else {
            assert.deepEqual(errors, [{
              code: 'invalid_state',
              message: 'Invalid state.',
            }]);
          }
        });
      });
    });

  });

  describe('combining validations - #8806', () => {

    describe('rule L or G exists', () => {

      const validations = [{
        property: 'patient_id',
        rule: 'exists("L","patient_id") || exists("G","patient_id")',
        message: [{
          content: 'Pregnancy not registered already',
          locale: 'en',
        }]
      }];

      it('should fail when neither L nor G exists', () => {
        sinon.stub(db.medic, 'query').resolves({ rows: [] });
        const doc = {
          _id: 'same',
          patient_id: '444',
        };
        return validation.validate(doc, validations).then(errors => {
          assert.equal(errors.length, 1);
        });
      });

      it('should pass when L exists for field value without spaces', () => {
        const freetext1 = 'patient_id:444';
        const freetext2 = 'form:l';
        const freetext3 = 'form:g';
        qualifier
          .onCall(0).returns({ freetext: freetext1 })
          .onCall(1).returns({ freetext: freetext2 })
          .onCall(2).returns({ freetext: freetext1 })
          .onCall(3).returns({ freetext: freetext3 });
        const mockGeneratorDifferent1 = async function* () {
          yield 'different1';
        };
        const mockGeneratorDifferent2 = async function* () {
          yield 'different2';
        };
        const mockGeneratorEmpty = async function* () {
        };
        reportGetUuids
          .onCall(0).resolves(mockGeneratorDifferent1) // once for patient_id=444
          .onCall(1).resolves(mockGeneratorDifferent1) // once for form=L
          .onCall(2).resolves(mockGeneratorDifferent2) // once for patient_id=444
          .onCall(3).resolves(mockGeneratorEmpty); // once for form=G
        sinon.stub(db.medic, 'allDocs').resolves({
          rows: [{
            id: 'different1',
            doc: { _id: 'different1', errors: [] },
          }],
        });
        const doc = {
          _id: 'same',
          patient_id: '444',
        };
        return validation.validate(doc, validations).then(errors => {
          assert.equal(dataContext.bind.callCount, 4);
          assert.equal(dataContext.bind.args[0][0], Report.v1.getUuids);
          assert.equal(dataContext.bind.args[1][0], Report.v1.getUuids);
          assert.equal(dataContext.bind.args[2][0], Report.v1.getUuids);
          assert.equal(dataContext.bind.args[3][0], Report.v1.getUuids);
          assert.equal(qualifier.callCount, 4);
          assert.equal(qualifier.args[0][0], freetext1);
          assert.equal(qualifier.args[1][0], freetext2);
          assert.equal(qualifier.args[2][0], freetext1);
          assert.equal(qualifier.args[3][0], freetext3);
          assert.equal(reportGetUuids.callCount, 4);
          assert.deepEqual(reportGetUuids.args[0][0], { freetext: freetext1 });
          assert.deepEqual(reportGetUuids.args[1][0], { freetext: freetext2 });
          assert.deepEqual(reportGetUuids.args[2][0], { freetext: freetext1 });
          assert.deepEqual(reportGetUuids.args[3][0], { freetext: freetext3 });
          assert.equal(db.medic.allDocs.callCount, 1);
          assert.equal(errors.length, 0);
        });
      });

      it('should pass when L exists for field value with spaces', () => {
        const freetext1 = 'form:l';
        const freetext2 = 'form:g';
        sinon.stub(db.medic, 'query')
          .onCall(0).resolves({ rows: [{ id: 'different1' }] })  // once for patient_id=444 555
          .onCall(1).resolves({ rows: [{ id: 'different2' }] });  // once for patient_id=444 555
        qualifier
          .onCall(0).returns({ freetext: freetext1 })
          .onCall(1).returns({ freetext: freetext2 });
        const mockGeneratorL = async function* () {
          yield 'different1';
        };
        const mockGeneratorG = async function* () {
        };
        reportGetUuids
          .onCall(0).resolves(mockGeneratorL) // once for form=L
          .onCall(1).resolves(mockGeneratorG); // once for form=G
        sinon.stub(db.medic, 'allDocs').resolves({
          rows: [{
            id: 'different1',
            doc: { _id: 'different1', errors: [] },
          }],
        });
        const doc = {
          _id: 'same',
          patient_id: '444 555',
        };
        return validation.validate(doc, validations).then(errors => {
          assert.equal(db.medic.query.callCount, 2);
          assert.equal(db.medic.query.args[0][0], 'medic-client/reports_by_freetext');
          assert.deepEqual(db.medic.query.args[0][1], { key: ['patient_id:444 555'] });
          assert.equal(db.medic.query.args[1][0], 'medic-client/reports_by_freetext');
          assert.deepEqual(db.medic.query.args[1][1], { key: ['patient_id:444 555'] });
          assert.equal(dataContext.bind.callCount, 2);
          assert.equal(dataContext.bind.args[0][0], Report.v1.getUuids);
          assert.equal(dataContext.bind.args[1][0], Report.v1.getUuids);
          assert.equal(qualifier.callCount, 2);
          assert.equal(qualifier.args[0][0], freetext1);
          assert.equal(qualifier.args[1][0], freetext2);
          assert.equal(reportGetUuids.callCount, 2);
          assert.deepEqual(reportGetUuids.args[0][0], { freetext: freetext1 });
          assert.deepEqual(reportGetUuids.args[1][0], { freetext: freetext2 });
          assert.equal(db.medic.allDocs.callCount, 1);
          assert.equal(errors.length, 0);
        });
      });

      it('should pass when G exists with field value without spaces', () => {
        const freetext1 = 'patient_id:444';
        const freetext2 = 'form:l';
        const freetext3 = 'form:g';
        qualifier
          .onCall(0).returns({ freetext: freetext1 })  // once for patient_id=444
          .onCall(1).returns({ freetext: freetext2 }) // once for form=L
          .onCall(2).returns({ freetext: freetext1 }) // once for patient_id=444
          .onCall(3).returns({ freetext: freetext3 }); // once for form=G

        const mockGeneratorDifferent1 = async function* () {
          yield 'different1';
        };
        const mockGeneratorDifferent2 = async function* () {
          yield 'different2';
        };
        const mockGeneratorEmpty = async function* () {
        };
        reportGetUuids
          .onCall(0).resolves(mockGeneratorDifferent1) // once for patient_id=444
          .onCall(1).resolves(mockGeneratorEmpty) // once for form=L
          .onCall(2).resolves(mockGeneratorDifferent2) // once for patient_id=444
          .onCall(3).resolves(mockGeneratorDifferent2); // once for form=G
        sinon.stub(db.medic, 'allDocs').resolves({
          rows: [{
            id: 'different2',
            doc: { _id: 'different2', errors: [] },
          }],
        });
        const doc = {
          _id: 'same',
          patient_id: '444',
        };
        return validation.validate(doc, validations).then(errors => {
          assert.equal(dataContext.bind.callCount, 4);
          assert.equal(dataContext.bind.args[0][0], Report.v1.getUuids);
          assert.equal(dataContext.bind.args[1][0], Report.v1.getUuids);
          assert.equal(dataContext.bind.args[2][0], Report.v1.getUuids);
          assert.equal(dataContext.bind.args[3][0], Report.v1.getUuids);
          assert.equal(qualifier.callCount, 4);
          assert.equal(qualifier.args[0][0], freetext1);
          assert.equal(qualifier.args[1][0], freetext2);
          assert.equal(qualifier.args[2][0], freetext1);
          assert.equal(qualifier.args[3][0], freetext3);
          assert.equal(reportGetUuids.callCount, 4);
          assert.deepEqual(reportGetUuids.args[0][0], { freetext: freetext1 });
          assert.deepEqual(reportGetUuids.args[1][0], { freetext: freetext2 });
          assert.deepEqual(reportGetUuids.args[2][0], { freetext: freetext1 });
          assert.deepEqual(reportGetUuids.args[3][0], { freetext: freetext3 });
          assert.equal(db.medic.allDocs.callCount, 1);
          assert.equal(errors.length, 0);
        });
      });

      it('should pass when G exists with field value with spaces', () => {
        const freetext1 = 'form:l';
        const freetext2 = 'form:g';
        sinon.stub(db.medic, 'query')
          .onCall(0).resolves({ rows: [{ id: 'different1' }] })  // once for patient_id=444
          .onCall(1).resolves({ rows: [{ id: 'different2' }] });  // once for patient_id=444
        qualifier
          .onCall(0).returns({ freetext: freetext1 })  // once for form=L
          .onCall(1).returns({ freetext: freetext2 }); // once for form=G
        const mockGeneratorL = async function* () {
        };
        const mockGeneratorG = async function* () {
          yield 'different2';
        };
        reportGetUuids
          .onCall(0).resolves(mockGeneratorL) // once for form=L
          .onCall(1).resolves(mockGeneratorG); // once for form=G
        sinon.stub(db.medic, 'allDocs').resolves({
          rows: [{
            id: 'different2',
            doc: { _id: 'different2', errors: [] },
          }],
        });
        const doc = {
          _id: 'same',
          patient_id: '444 555',
        };
        return validation.validate(doc, validations).then(errors => {
          assert.equal(db.medic.query.callCount, 2);
          assert.equal(db.medic.query.args[0][0], 'medic-client/reports_by_freetext');
          assert.deepEqual(db.medic.query.args[0][1], { key: ['patient_id:444 555'] });
          assert.equal(db.medic.query.args[1][0], 'medic-client/reports_by_freetext');
          assert.deepEqual(db.medic.query.args[1][1], { key: ['patient_id:444 555'] });
          assert.equal(dataContext.bind.callCount, 2);
          assert.equal(dataContext.bind.args[0][0], Report.v1.getUuids);
          assert.equal(dataContext.bind.args[1][0], Report.v1.getUuids);
          assert.equal(qualifier.callCount, 2);
          assert.equal(qualifier.args[0][0], freetext1);
          assert.equal(qualifier.args[1][0], freetext2);
          assert.equal(reportGetUuids.callCount, 2);
          assert.deepEqual(reportGetUuids.args[0][0], { freetext: freetext1 });
          assert.deepEqual(reportGetUuids.args[1][0], { freetext: freetext2 });
          assert.equal(db.medic.allDocs.callCount, 1);
          assert.equal(errors.length, 0);
        });
      });

      it('should pass when L and G exist for field value without spaces', () => {
        const freetext1 = 'patient_id:444';
        const freetext2 = 'form:l';
        const freetext3 = 'form:g';
        qualifier
          .onCall(0).returns({ freetext: freetext1 })  // once for patient_id=444
          .onCall(1).returns({ freetext: freetext2 }) // once for form=L
          .onCall(2).returns({ freetext: freetext1 }) // once for patient_id=444
          .onCall(3).returns({ freetext: freetext3 }); // once for form=G
        const mockGeneratorDifferent1 = async function* () {
          yield 'different1';
        };
        const mockGeneratorDifferent2 = async function* () {
          yield 'different2';
        };
        reportGetUuids
          .onCall(0).resolves(mockGeneratorDifferent1) // once for patient_id=444
          .onCall(1).resolves(mockGeneratorDifferent1) // once for form=L
          .onCall(2).resolves(mockGeneratorDifferent2) // once for patient_id=444
          .onCall(3).resolves(mockGeneratorDifferent2); // once for form=G
        sinon.stub(db.medic, 'allDocs')
          .onCall(0).resolves({
            rows: [{
              id: 'different1',
              doc: { _id: 'different1', errors: [] },
            }],
          })
          .onCall(1).resolves({
            rows: [{
              id: 'different2',
              doc: { _id: 'different2', errors: [] },
            }],
          });
        const doc = {
          _id: 'same',
          patient_id: '444',
        };
        return validation.validate(doc, validations).then(errors => {
          assert.equal(dataContext.bind.callCount, 4);
          assert.equal(dataContext.bind.args[0][0], Report.v1.getUuids);
          assert.equal(dataContext.bind.args[1][0], Report.v1.getUuids);
          assert.equal(dataContext.bind.args[2][0], Report.v1.getUuids);
          assert.equal(dataContext.bind.args[3][0], Report.v1.getUuids);
          assert.equal(qualifier.callCount, 4);
          assert.equal(qualifier.args[0][0], freetext1);
          assert.equal(qualifier.args[1][0], freetext2);
          assert.equal(qualifier.args[2][0], freetext1);
          assert.equal(qualifier.args[3][0], freetext3);
          assert.equal(reportGetUuids.callCount, 4);
          assert.deepEqual(reportGetUuids.args[0][0], { freetext: freetext1 });
          assert.deepEqual(reportGetUuids.args[1][0], { freetext: freetext2 });
          assert.deepEqual(reportGetUuids.args[2][0], { freetext: freetext1 });
          assert.deepEqual(reportGetUuids.args[3][0], { freetext: freetext3 });
          assert.equal(db.medic.allDocs.callCount, 2);
          assert.equal(errors.length, 0);
        });
      });
      
      it('should pass when L and G exist for field value with spaces', () => {
        const freetext1 = 'form:l';
        const freetext2 = 'form:g';
        sinon.stub(db.medic, 'query')
          .onCall(0).resolves({ rows: [{ id: 'different1' }] }) // once for patient_id=444
          .onCall(1).resolves({ rows: [{ id: 'different2' }] });  // once for patient_id=444
        qualifier
          .onCall(0).returns({ freetext: freetext1 })  // once for form=L
          .onCall(1).returns({ freetext: freetext2 }); // once for form=G
        const mockGeneratorL = async function* () {
          yield 'different1';
        };
        const mockGeneratorG = async function* () {
          yield 'different2';
        };
        reportGetUuids
          .onCall(0).resolves(mockGeneratorL) // once for form=L
          .onCall(1).resolves(mockGeneratorG); // once for form=G
        sinon.stub(db.medic, 'allDocs')
          .onCall(0).resolves({
            rows: [{
              id: 'different1',
              doc: { _id: 'different1', errors: [] },
            }],
          })
          .onCall(1).resolves({
            rows: [{
              id: 'different2',
              doc: { _id: 'different2', errors: [] },
            }],
          });
        const doc = {
          _id: 'same',
          patient_id: '444 555',
        };
        return validation.validate(doc, validations).then(errors => {
          assert.equal(dataContext.bind.callCount, 2);
          assert.equal(dataContext.bind.args[0][0], Report.v1.getUuids);
          assert.equal(dataContext.bind.args[1][0], Report.v1.getUuids);
          assert.equal(qualifier.callCount, 2);
          assert.equal(qualifier.args[0][0], freetext1);
          assert.equal(qualifier.args[1][0], freetext2);
          assert.equal(reportGetUuids.callCount, 2);
          assert.deepEqual(reportGetUuids.args[0][0], { freetext: freetext1 });
          assert.deepEqual(reportGetUuids.args[1][0], { freetext: freetext2 });
          assert.equal(db.medic.query.callCount, 2);
          assert.equal(db.medic.allDocs.callCount, 2);
          assert.equal(errors.length, 0);
        });
      });
    });

    describe('rule length and exists', () => {

      const validations = [{
        property: 'patient_id',
        rule: 'lenMin(2) && exists("G","patient_id")',
        message: [{
          content: 'Pregnancy not registered already',
          locale: 'en',
        }]
      }];

      it('should fail when patient id too short', () => {
        sinon.stub(db.medic, 'query').resolves({ rows: [] });
        const doc = {
          _id: 'same',
          patient_id: '1',
        };
        return validation.validate(doc, validations).then(errors => {
          assert.equal(errors.length, 1);
        });
      });

      it('should fail when not exists', () => {
        sinon.stub(db.medic, 'query').resolves({ rows: [] });
        sinon.stub(db.medic, 'allDocs')
          .onCall(0).resolves({
            rows: [{
              id: 'different1',
              doc: { _id: 'different1', errors: [] },
            }],
          });
        const doc = {
          _id: 'same',
          patient_id: '123',
        };
        return validation.validate(doc, validations).then(errors => {
          assert.equal(errors.length, 1);
        });
      });

      it('should pass when long enough and exists for text without spaces', () => {
        const freetext1 = 'patient_id:123';
        const freetext2 = 'form:g';
        qualifier
          .onCall(0).returns({ freetext: freetext1 })
          .onCall(1).returns({ freetext: freetext2 });
        const mockGenerator = async function* () {
          yield 'different1';
        };
        reportGetUuids
          .onCall(0).resolves(mockGenerator) // once for patient_id=123
          .onCall(1).resolves(mockGenerator); // once for form=G
        sinon.stub(db.medic, 'allDocs')
          .onCall(0).resolves({
            rows: [{
              id: 'different1',
              doc: { _id: 'different1', errors: [] },
            }],
          });
        const doc = {
          _id: 'same',
          patient_id: '123',
        };
        return validation.validate(doc, validations).then(errors => {
          assert.equal(errors.length, 0);
          assert.equal(dataContext.bind.callCount, 2);
          assert.equal(dataContext.bind.args[0][0], Report.v1.getUuids);
          assert.equal(dataContext.bind.args[1][0], Report.v1.getUuids);
          assert.equal(qualifier.callCount, 2);
          assert.equal(qualifier.args[0][0], freetext1);
          assert.equal(qualifier.args[1][0], freetext2);
          assert.equal(reportGetUuids.callCount, 2);
          assert.deepEqual(reportGetUuids.args[0][0], { freetext: freetext1 });
          assert.deepEqual(reportGetUuids.args[1][0], { freetext: freetext2 });
          assert.equal(db.medic.allDocs.callCount, 1);
        });
      });
      
      it('should pass when long enough and exists for text with spaces', () => {
        const freetext = 'form:g';
        const view = sinon.stub(db.medic, 'query')
          .onCall(0).resolves({ rows: [{ id: 'different1' }] }); // once for patient_id=444
        qualifier.returns({ freetext });
        const mockGenerator = async function* () {
          yield 'different1';
        };
        reportGetUuids.resolves(mockGenerator); // once for form=G
        sinon.stub(db.medic, 'allDocs')
          .onCall(0).resolves({
            rows: [{
              id: 'different1',
              doc: { _id: 'different1', errors: [] },
            }],
          });
        const doc = {
          _id: 'same',
          patient_id: '123 456',
        };
        return validation.validate(doc, validations).then(errors => {
          assert.equal(errors.length, 0);
          assert.equal(view.callCount, 1);
          assert.equal(view.args[0][0], 'medic-client/reports_by_freetext');
          assert.deepEqual(view.args[0][1], { key: ['patient_id:123 456'] });
          assert.equal(dataContext.bind.callCount, 1);
          assert.equal(dataContext.bind.args[0][0], Report.v1.getUuids);
          assert.equal(qualifier.callCount, 1);
          assert.equal(qualifier.args[0][0], freetext);
          assert.equal(reportGetUuids.callCount, 1);
          assert.deepEqual(reportGetUuids.args[0][0], { freetext });
          assert.equal(db.medic.allDocs.callCount, 1);
        });
      });

    });

  });
  
  describe('multiple rules on a property', () => {

    // these rules are impossible to satisfy but it means we can test handling of multiple failures
    const validations = [
      {
        property: 'lmp_date',
        rule: 'isAfter("40 weeks")',
        message: [{
          content: 'Date should be later than 40 weeks from now.',
          locale: 'en'
        }]
      },
      {
        property: 'lmp_date',
        rule: 'isBefore("8 weeks")',
        message: [{
          content: 'Date should be older than 8 weeks ago.',
          locale: 'en'
        }]
      }
    ];

    it('should pass when long enough and exists', () => {
      const doc = {
        _id: 'same',
        lmp_date: moment().valueOf(),
        reported_date: moment().valueOf()
      };
      return validation.validate(doc, validations).then(errors => {
        assert.deepEqual(errors, [
          {
            code: 'invalid_lmp_date',
            message: 'Date should be later than 40 weeks from now.',
          },
          {
            code: 'invalid_lmp_date',
            message: 'Date should be older than 8 weeks ago.',
          },
        ]);
      });
    });

  });

  it('should validate integers', () => {
    const validations = [
      {
        property: 'lmp_year',
        rule: '(integer && min(2078) && max(2090))',
        translation_key: 'registration.lmp_date.year.incorrect'
      },
      {
        property: 'lmp_month',
        rule: '(integer && min(1) && max(12))',
        translation_key: 'registration.lmp_date.month.incorrect'
      }
    ];
    const doc = {
      _id: 'same',
      lmp_year: '2080',
      lmp_month: '10'
    };
    return validation.validate(doc, validations).then(errors => {
      assert.deepEqual(errors, []);
    });
  });

});
