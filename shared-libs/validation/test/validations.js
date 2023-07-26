const moment = require('moment');
const rewire = require('rewire');
const sinon = require('sinon');
const assert = require('chai').assert;

const validation = rewire('../src/validation');

let clock;
let db;
let config;
let translate;
const logger = console;

const stubMe = (functionName) => {
  logger.error(new Error(
    `db.${functionName}() not stubbed!` +
    `Please stub PouchDB functions that will be interacted with in unit tests.`
  ));
  process.exit(1);
};

describe('validations', () => {
  beforeEach(() => {
    db = { medic: { query: () => stubMe('query'), allDocs: () => stubMe('allDocs') } };
    config = {};
    translate = sinon.stub().returnsArg(0);

    validation.init({ db, config, translate, logger });
  });
  afterEach(() => {
    if (clock) {
      clock.restore();
    }
    sinon.restore();
  });

  it('should throw an error when validate is called without initialization', () => {
    validation.__set__('inited', false);
    assert.throws(validation.validate, '');
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

  it('pass unique validation when no doc found', () => {
    const view = sinon.stub(db.medic, 'query').resolves({ rows: [] });
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
      assert.equal(view.callCount, 1);
      assert.equal(view.args[0][0], 'medic-client/reports_by_freetext');
      assert.deepEqual(view.args[0][1], { key: ['patient_id:111'] });
      assert.equal(errors.length, 0);
    });
  });

  it('pass unique validation when doc is the same', () => {
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
      patient_id: '111',
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(view.callCount, 1);
      assert.equal(view.args[0][0], 'medic-client/reports_by_freetext');
      assert.deepEqual(view.args[0][1], { key: ['patient_id:111'] });
      assert.equal(errors.length, 0);
    });
  });

  it('pass unique validation when doc has errors', () => {
    const view = sinon.stub(db.medic, 'query').resolves({
      rows: [{ id: 'different' }],
    });
    const allDocs = sinon.stub(db.medic, 'allDocs').callsArgWith(1, null, {
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
      assert.equal(view.callCount, 1);
      assert.equal(view.args[0][0], 'medic-client/reports_by_freetext');
      assert.deepEqual(view.args[0][1], { key: ['patient_id:111'] });
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
          code: 'invalid_xyz_unique',
          message: 'Duplicate: {{xyz}}.',
        },
      ]);
    });
  });

  it('fail multiple field unique validation on doc with no errors', () => {
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
      xyz: '444',
      abc: 'CHeeSE', // value is lowercased as it is in the view map definition
    };
    return validation.validate(doc, validations).then(errors => {
      assert.equal(view.callCount, 2);
      assert.equal(view.args[0][0], 'medic-client/reports_by_freetext');
      assert.deepEqual(view.args[0][1], { key: ['xyz:444'] });
      assert.equal(view.args[1][0], 'medic-client/reports_by_freetext');
      assert.deepEqual(view.args[1][1], { key: ['abc:cheese'] });
      assert.equal(allDocs.callCount, 1);
      assert.deepEqual(allDocs.args[0][0], { keys: ['different'], include_docs: true });
      assert.deepEqual(errors, [
        {
          code: 'invalid_xyz_unique',
          message: 'Duplicate xyz {{xyz}} and abc {{abc}}.',
        },
      ]);
    });
  });

  it.only('should fail uniquePhone if doc is found in db', () => {
    clock = sinon.useFakeTimers();
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

  it.only('should pass uniquePhone if doc is not found in db', () => {
    clock = sinon.useFakeTimers();
    sinon.stub(db.medic, 'query').resolves({ undefined });
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
      assert.equal(errors.length, 0);
    });
  });

  it('pass uniqueWithin validation on old doc', () => {
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
      xyz: '444',
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
          code: 'invalid_xyz_uniqueWithin',
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

  it('pass exists validation when matching document', () => {
    const view = sinon.stub(db.medic, 'query').resolves({
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
      assert.equal(view.callCount, 2);
      assert.equal(view.args[0][0], 'medic-client/reports_by_freetext');
      assert.deepEqual(view.args[0][1], { key: ['patient_id:444'] });
      assert.equal(view.args[1][0], 'medic-client/reports_by_freetext');
      assert.deepEqual(view.args[1][1], { key: ['form:registration'] });
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
          code: 'invalid_parent_id_exists',
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
          code: 'invalid_parent_id_exists',
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
          code: 'invalid_lmp_date_isBefore',
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
          code: 'invalid_lmp_date_isBefore',
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
          code: 'invalid_lmp_date_isBefore',
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
          code: 'invalid_lmp_date_isAfter',
          message: 'Invalid date.',
        },
      ]);
    });
  });
});
