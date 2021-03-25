const sinon = require('sinon');
const rewire = require('rewire');
const assert = require('chai').assert;
const moment = require('moment');
const transitionUtils = require('../../src/transitions/utils');
const utils = require('../../src/lib/utils');
const config = require('../../src/config');
const contactTypeUtils = require('@medic/contact-types-utils');
const db = require('../../src/db');

const transition = rewire('../../src/transitions/registration');

const getMessage = doc => {
  if (!doc || !doc.tasks) {
    return;
  }
  return doc.tasks[0].messages[0].message;
};

describe('pregnancy registration', () => {
  afterEach(() => sinon.restore());

  beforeEach(() => {
    transition.setExpectedBirthDate = transition.__get__('setExpectedBirthDate');
    sinon.stub(config, 'get').returns([{
      form: 'p',
      type: 'pregnancy',
      events: [
        {
          name: 'on_create',
          trigger: 'add_patient_id',
          params: '',
          bool_expr: ''
        },
        {
          name: 'on_create',
          trigger: 'add_expected_date',
          params: '',
          bool_expr: 'typeof doc.getid === "undefined"'
        }
      ],
      validations: {
        join_responses: true,
        list: [
          {
            property: 'lmp',
            rule: 'min(0) && max(40)',
            message: [{
              content: 'Invalid LMP; must be between 0-40 weeks.',
              locale: 'en'
            }]
          },
          {
            property: 'patient_name',
            rule: 'lenMin(1) && lenMax(100)',
            message: [{
              content: 'Invalid patient name.',
              locale: 'en'
            }]
          }
        ]
      }
    },{
      // Pregnancy for existing patient
      form: 'ep',
      type: 'pregnancy',
      events: [
        // See, no patient id creation!
        // {
        //     name: 'on_create',
        //     trigger: 'add_patient_id',
        //     params: '',
        //     bool_expr: ''
        // },
        {
          name: 'on_create',
          trigger: 'add_expected_date',
          params: '',
          bool_expr: 'typeof doc.getid === "undefined"'
        }
      ],
      validations: {
        join_responses: true,
        list: [
          {
            property: 'lmp',
            rule: 'min(0) && max(40)',
            message: [{
              content: 'Invalid LMP; must be between 0-40 weeks.',
              locale: 'en'
            }]
          },
          {
            property: 'patient_id',
            rule: 'len(5)',
            message: [{
              content: 'Invalid patient Id.',
              locale: 'en'
            }]
          }
        ]
      }
    }]);
  });

  it('filter fails with empty doc', () => {
    assert(!transition.filter({}));
  });

  it('filter fails with no clinic phone and private form', () => {
    const doc = { form: 'p', type: 'data_record'};
    sinon.stub(utils, 'getForm').returns({ public_form: false });
    assert(!transition.filter(doc));
  });

  it('filter does not fail if doc has errors', () => {
    const doc = { form: 'p', type: 'data_record', errors: [ 'some error ' ], contact: { phone: '+123' } };
    sinon.stub(utils, 'getForm').returns({ public_form: true });
    assert(transition.filter(doc));
  });

  it('filter fails if form is unknown', () => {
    const doc = { form: 'x' , type: 'data_record', contact: { phone: '+123' }};
    assert(!transition.filter(doc));
  });

  it('filter succeeds with no clinic phone if public form', () => {
    const doc = { form: 'p' , type: 'data_record'};
    sinon.stub(utils, 'getForm').returns({ public_form: true });
    assert(transition.filter(doc));
  });

  it('filter succeeds with populated doc', () => {
    const doc = { form: 'p' , type: 'data_record', contact: { phone: '+123' }};
    sinon.stub(utils, 'getForm').returns({});
    assert(transition.filter(doc));
  });

  it('setExpectedBirthDate sets lmp_date and expected_date to null when lmp 0', () => {
    const doc = { fields: { lmp: 0 }, type: 'data_record' };
    transition.setExpectedBirthDate(doc);
    assert.equal(doc.lmp_date, null);
    assert.equal(doc.expected_date, null);
  });

  it('setExpectedBirthDate sets lmp_date and expected_date correctly for lmp: 10', () => {
    const doc = { fields: { lmp: '10', type: 'data_record'} };
    const start = moment().startOf('day');

    transition.setExpectedBirthDate(doc);

    assert(doc.lmp_date);
    assert.equal(doc.lmp_date, start.clone().subtract(10, 'weeks').toISOString());
    assert.equal(doc.expected_date, start.clone().add(30, 'weeks').toISOString());
  });

  it('setExpectedBirthDate sets lmp_date and expected_date correctly when doc has reported_date', () => {
    const reported_date = moment().subtract(1, 'week');
    const doc = { fields: { lmp: '5', type: 'data_record' }, reported_date: reported_date.valueOf() };

    transition.setExpectedBirthDate(doc);

    assert(doc.lmp_date);
    assert.equal(doc.lmp_date, reported_date.clone().startOf('day').subtract(5, 'weeks').toISOString());
    assert.equal(doc.expected_date, reported_date.clone().startOf('day').add(35, 'weeks').toISOString());
  });

  it('valid adds lmp_date and patient_id', () => {
    const start = moment().startOf('day').subtract(5, 'weeks');

    sinon.stub(utils, 'getContactUuid').resolves('uuid');

    sinon.stub(transitionUtils, 'getUniqueId').resolves(12345);

    const doc = {
      form: 'p',
      type: 'data_record',
      fields: {
        patient_name: 'abc',
        lmp: 5
      }
    };

    return transition.onMatch({ doc: doc }).then(function(changed) {
      assert.equal(changed, true);
      assert.equal(doc.lmp_date, start.toISOString());
      assert(doc.patient_id);
      assert.equal(doc.tasks, undefined);
    });
  });

  it('pregnancies on existing patients fail without valid patient id', () => {
    sinon.stub(utils, 'getRegistrations').resolves([]);
    sinon.stub(utils, 'getContactUuid').resolves();

    const doc = {
      form: 'ep',
      type: 'data_record',
      fields: {
        patient_id: '12345',
        lmp: 5
      }
    };

    return transition.onMatch({ doc: doc }).then(function(changed) {
      assert.equal(changed, true);
      assert.equal(doc.errors.length, 1);
      assert.equal(doc.errors[0].message, 'messages.generic.registration_not_found');
    });
  });

  it('pregnancies on existing patients succeeds with a valid patient id', () => {
    sinon.stub(utils, 'getRegistrations').resolves([]);

    const doc = {
      form: 'ep',
      type: 'data_record',
      fields: {
        patient_id: '12345',
        lmp: 5
      },
      patient: {
        _id: 'uuid',
        patient_id: '12345',
        type: 'person'
      }
    };

    return transition.onMatch({ doc: doc }).then(function(changed) {
      assert.equal(changed, true);
      assert(!doc.errors);
    });
  });


  it('zero lmp value only registers patient', () => {
    sinon.stub(utils, 'getContactUuid').resolves(undefined);
    sinon.stub(transitionUtils, 'getUniqueId').resolves(12345);
    sinon.stub(contactTypeUtils, 'isParentOf').returns(true);
    sinon.stub(db.medic, 'post').resolves();

    const doc = {
      _id: 'doc_id',
      form: 'p',
      type: 'data_record',
      contact: { _id: 'contact', parent: { _id: 'parent' } },
      fields: {
        patient_name: 'abc',
        lmp: 0
      },
      reported_date: 12345678956
    };

    return transition.onMatch({ doc: doc }).then(function(changed) {
      assert.equal(changed, true);
      assert.equal(doc.lmp_date, null);
      assert.equal(doc.patient_id, 12345);
      assert.equal(doc.tasks, undefined);
      assert.equal(db.medic.post.callCount, 1);
      assert.equal(utils.getContactUuid.callCount, 1);
      assert.deepEqual(utils.getContactUuid.args[0], [12345]);
      assert.deepEqual(db.medic.post.args[0], [{
        created_by: 'contact',
        name: 'abc',
        parent: { _id: 'parent' },
        patient_id: 12345,
        type: 'person',
        source_id: 'doc_id',
        reported_date: 12345678956,
      }]);
    });
  });

  it('id only logic with valid name', () => {
    sinon.stub(utils, 'getContactUuid').resolves('uuid');

    sinon.stub(transitionUtils, 'getUniqueId').resolves(12345);

    const doc = {
      form: 'p',
      type: 'data_record',
      fields: {
        patient_name: 'abc',
        lmp: 5
      },
      getid: 'x'
    };

    return transition.onMatch({ doc: doc }).then(function(changed) {
      assert.equal(changed, true);
      assert.equal(doc.lmp_date, undefined);
      assert(doc.patient_id);
    });
  });

  it('id only logic with invalid name', () => {
    sinon.stub(utils, 'getRegistrations').resolves([]);
    sinon.stub(utils, 'getContactUuid').resolves('uuid');

    const doc = {
      form: 'p',
      from: '+12345',
      type: 'data_record',
      fields: {
        patient_name: '',
        lmp: 5
      },
      getid: 'x'
    };

    return transition.onMatch({ doc: doc }).then(function(changed) {
      assert.equal(changed, true);
      assert.equal(doc.patient_id, undefined);
      assert(doc.tasks);
      assert.equal(getMessage(doc), 'Invalid patient name.');
    });
  });

  it('invalid name valid LMP logic', () => {
    const doc = {
      form: 'p',
      from: '+1234',
      type: 'data_record',
      fields: {
        patient_name: '',
        lmp: 5
      }
    };

    return transition.onMatch({ doc: doc }).then(function(changed) {
      assert.equal(changed, true);
      assert.equal(doc.patient_id, undefined);
      assert.equal(getMessage(doc), 'Invalid patient name.');
    });
  });

  it('valid name invalid LMP logic', () => {
    const doc = {
      form: 'p',
      from: '+1234',
      type: 'data_record',
      fields: {
        patient_name: 'hi',
        lmp: 45
      }
    };

    return transition.onMatch({ doc: doc }).then(function(changed) {
      assert.equal(changed, true);
      assert.equal(doc.patient_id, undefined);
      assert.equal(getMessage(doc), 'Invalid LMP; must be between 0-40 weeks.');
    });
  });

  it('invalid name invalid LMP logic', () => {
    const doc = {
      form: 'p',
      from: '+123',
      type: 'data_record',
      fields: {
        patient_name: '',
        lmp: 45
      }
    };

    return transition.onMatch({ doc: doc }).then(function(changed) {
      assert.equal(changed, true);
      assert.equal(doc.patient_id, undefined);
      assert.equal(getMessage(doc), 'Invalid patient name.  Invalid LMP; must be between 0-40 weeks.');
    });
  });

  it('mismatched form returns false', done => {
    const doc = {
      form: 'x',
      type: 'data_record'
    };
    transition.onMatch({ doc: doc })
      .then(() => {
        done(new Error('Error should have been thrown'));
      })
      .catch(() => {
        // expected
        done();
      });
  });

  it('missing all fields returns validation errors', () => {
    const doc = {
      form: 'p',
      from: '+123',
      type: 'data_record'
    };
    return transition.onMatch({ doc: doc }).then(function(changed) {
      assert.equal(changed, true);
      assert.equal(
        getMessage(doc),
        'Invalid LMP; must be between 0-40 weeks.  Invalid patient name.'
      );
    });
  });

});
