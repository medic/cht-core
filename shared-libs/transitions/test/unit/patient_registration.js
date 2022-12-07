const  moment = require('moment');
const sinon = require('sinon');
const assert = require('chai').assert;
const rewire = require('rewire');
const db = require('../../src/db');
const utils = require('../../src/lib/utils');
const config = require('../../src/config');

const getMessage = (doc, idx) => {
  if (!doc || !doc.tasks) {
    return;
  }
  if (!idx) {
    return doc.tasks[0].messages[0];
  }
  if (doc.tasks[idx]) {
    return doc.tasks[idx].messages[0];
  }
};

describe('patient registration', () => {
  let transitionUtils;
  let transition;

  beforeEach(() => {
    config.init({
      getAll: sinon.stub().returns({}),
      get: sinon.stub().returns([
        {
          form: 'PATR',
          events: [
            {
              name: 'on_create',
              trigger: 'add_patient_id',
              params: '',
              bool_expr: '',
            },
          ],
          validations: [
            {
              property: 'patient_name',
              rule: 'lenMin(1) && lenMax(100)',
              message: 'Invalid patient name.',
            },
          ],
          messages: [
            {
              message: [
                {
                  content: 'thanks {{contact.name}}',
                  locale: 'en',
                },
                {
                  content: 'gracias {{contact.name}}',
                  locale: 'es',
                },
              ],
              recipient: 'reporting_unit',
            },
            {
              message: [
                {
                  content: 'thanks {{fields.caregiver_name}}',
                  locale: 'en',
                },
                {
                  content: 'gracias {{fields.caregiver_name}}',
                  locale: 'es',
                },
              ],
              recipient: 'caregiver_phone',
            },
          ],
        },
        {
          form: 'P',
          validations: {
            join_responses: true,
            list: [
              {
                property: 'last_menstrual_period',
                rule: 'integer && between(2,42)',
                message: [
                  {
                    content: 'Something something {{patient_name}}',
                    locale: 'en',
                  },
                ],
              },
            ],
          },
        },
      ]),
      getTranslations: sinon.stub().returns({})
    });

    transitionUtils = require('../../src/transitions/utils');
    transition = rewire('../../src/transitions/registration');

    transition.getWeeksSinceLMP = transition.__get__('getWeeksSinceLMP');
    transition.getYearsSinceDOB = transition.__get__('getYearsSinceDOB');
    transition.getMonthsSinceDOB = transition.__get__('getMonthsSinceDOB');
    transition.getWeeksSinceDOB = transition.__get__('getWeeksSinceDOB');
    transition.getDaysSinceDOB = transition.__get__('getDaysSinceDOB');
    transition.getDOB = transition.__get__('getDOB');
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  it('getWeeksSinceLMP returns 0 not NaN or null', () => {
    assert.equal(transition.getWeeksSinceLMP({ fields: { lmp: 0 } }), 0);
    assert.equal(
      typeof transition.getWeeksSinceLMP({ fields: { lmp: 0 } }),
      'number'
    );
    assert.equal(
      transition.getWeeksSinceLMP({ fields: { weeks_since_lmp: 0 } }),
      0
    );
    assert.equal(
      typeof transition.getWeeksSinceLMP({ fields: { weeks_since_lmp: 0 } }),
      'number'
    );
    assert.equal(
      transition.getWeeksSinceLMP({ fields: { last_menstrual_period: 0 } }),
      0
    );
    assert.equal(
      typeof transition.getWeeksSinceLMP({
        fields: { last_menstrual_period: 0 },
      }),
      'number'
    );
  });

  it('getWeeksSinceLMP always returns number', () => {
    assert.equal(transition.getWeeksSinceLMP({ fields: { lmp: '12' } }), 12);
  });

  it('getWeeksSinceLMP supports three property names', () => {
    assert.equal(transition.getWeeksSinceLMP({ fields: { lmp: '12' } }), 12);
    assert.equal(
      transition.getWeeksSinceLMP({ fields: { weeks_since_lmp: '12' } }),
      12
    );
    assert.equal(
      transition.getWeeksSinceLMP({ fields: { last_menstrual_period: '12' } }),
      12
    );
  });

  it('getYearsSinceDOB supports three property names', () => {
    assert.equal(
      transition.getYearsSinceDOB({ fields: { years_since_dob: '12' } }),
      12
    );
    assert.equal(
      transition.getYearsSinceDOB({ fields: { years_since_birth: '12' } }),
      12
    );
    assert.equal(
      transition.getYearsSinceDOB({ fields: { age_in_years: '12' } }),
      12
    );
  });

  it('getMonthsSinceDOB supports three property names', () => {
    assert.equal(
      transition.getMonthsSinceDOB({ fields: { months_since_dob: '12' } }),
      12
    );
    assert.equal(
      transition.getMonthsSinceDOB({ fields: { months_since_birth: '12' } }),
      12
    );
    assert.equal(
      transition.getMonthsSinceDOB({ fields: { age_in_months: '12' } }),
      12
    );
  });

  it('getWeeksSinceDOB supports four property names', () => {
    assert.equal(transition.getWeeksSinceDOB({ fields: { dob: '12' } }), 12);
    assert.equal(
      transition.getWeeksSinceDOB({ fields: { weeks_since_dob: '12' } }),
      12
    );
    assert.equal(
      transition.getWeeksSinceDOB({ fields: { weeks_since_birth: '12' } }),
      12
    );
    assert.equal(
      transition.getWeeksSinceDOB({ fields: { age_in_weeks: '12' } }),
      12
    );
  });

  it('getDaysSinceDOB supports three property names', () => {
    assert.equal(
      transition.getDaysSinceDOB({ fields: { days_since_dob: '12' } }),
      12
    );
    assert.equal(
      transition.getDaysSinceDOB({ fields: { days_since_birth: '12' } }),
      12
    );
    assert.equal(
      transition.getDaysSinceDOB({ fields: { age_in_days: '12' } }),
      12
    );
  });

  it('getDOB uses weeks since dob if available', () => {
    const reported_date = 1474942416907;
    const expected = moment(reported_date)
      .startOf('day')
      .subtract(5, 'weeks')
      .valueOf();
    transition.__set__('getWeeksSinceDOB', sinon.stub().returns('5'));
    assert.equal(transition.getDOB({ fields: {}, reported_date: reported_date }).valueOf(), expected);
  });

  it('getDOB uses days since dob if available', () => {
    const reported_date = 1474942416907;
    const expected = moment(reported_date)
      .startOf('day')
      .subtract(5, 'days')
      .valueOf();
    transition.__set__('getWeeksSinceDOB', sinon.stub().returns(undefined));
    transition.__set__('getDaysSinceDOB', sinon.stub().returns('5'));
    assert.equal(transition.getDOB({ fields: {}, reported_date: reported_date }).valueOf(), expected);
  });

  it('getDOB falls back to reported_date if necessary', () => {
    const reported_date = 1474942416907;
    const expected = moment(reported_date)
      .startOf('day')
      .valueOf();
    transition.__set__('getWeeksSinceDOB', sinon.stub().returns(undefined));
    transition.__set__('getDaysSinceDOB', sinon.stub().returns(undefined));
    assert.equal(transition.getDOB({ fields: {}, reported_date: reported_date }).valueOf(), expected);
  });

  it('getDOB falls back to be relative to today if no reported date', () => {
    const expected = moment().startOf('day').subtract(4, 'days').valueOf();
    transition.__set__('getWeeksSinceDOB', sinon.stub().returns(undefined));
    transition.__set__('getDaysSinceDOB', sinon.stub().returns('4'));
    assert.equal(transition.getDOB({ fields: {} }).valueOf(), expected);
  });

  it('valid form adds patient_id and patient document', () => {
    sinon.stub(utils, 'getContactUuid').resolves();
    sinon.stub(transitionUtils, 'getUniqueId').resolves('12345');
    config.getAll.returns({
      contact_types: [
        { id: 'some_place' },
        { id: 'person', parents: ['some_place'], person: true }
      ]
    });

    const doc = {
      _id: 'docid',
      form: 'PATR',
      fields: { patient_name: 'abc' },
      contact: { _id: 'the-contact', parent: { _id: 'the-parent', type: 'some_place' } },
      reported_date: 'now',
    };
    const saveDoc = sinon.stub(db.medic, 'post').resolves();

    return transition.onMatch({ doc: doc }).then(changed => {
      assert.equal(changed, true);
      assert(doc.patient_id);
      assert(saveDoc.called);

      assert.deepEqual(saveDoc.args[0][0], {
        name: 'abc',
        parent: {
          _id: 'the-parent',
        },
        reported_date: 'now',
        type: 'person',
        patient_id: doc.patient_id,
        created_by: 'the-contact',
        source_id: 'docid',
      });
    });
  });

  it('registration sets up responses', () => {
    sinon.stub(utils, 'getRegistrations').resolves([]);
    sinon.stub(utils, 'getContactUuid').resolves('uuid');
    sinon.stub(transitionUtils, 'getUniqueId').resolves(12345);

    const doc = {
      form: 'PATR',
      from: '+1234',
      fields: {
        patient_name: 'foo',
        caregiver_name: 'Sam',
        caregiver_phone: '+987',
      },
      contact: {
        phone: '+1234',
        name: 'Julie',
      },
      locale: 'en',
    };

    return transition.onMatch({ doc: doc }).then(changed => {
      assert.equal(changed, true);
      assert(doc.tasks);
      assert.equal(doc.tasks && doc.tasks.length, 2);

      const msg0 = getMessage(doc, 0);
      assert(msg0);
      assert(msg0.uuid);
      assert(msg0.to);
      assert(msg0.message);
      if (msg0) {
        delete msg0.uuid;
        assert.deepEqual(msg0, {
          to: '+1234',
          message: 'thanks Julie',
        });
      }

      /*
       * Also checks that recipient using doc property value is handled
       * resolved correctly
       * */
      const msg1 = getMessage(doc, 1);
      assert(msg1);
      assert(msg1.uuid);
      assert(msg1.to);
      assert(msg1.message);
      if (msg1) {
        delete msg1.uuid;
        assert.deepEqual(msg1, {
          to: '+987',
          message: 'thanks Sam',
        });
      }
    });
  });

  it('registration responses support locale', () => {
    sinon.stub(utils, 'getRegistrations').resolves([]);
    sinon.stub(utils, 'getContactUuid').resolves('uuid');
    sinon.stub(transitionUtils, 'getUniqueId').resolves(12345);

    const doc = {
      form: 'PATR',
      fields: {
        patient_name: 'foo',
        caregiver_name: 'Sam',
        caregiver_phone: '+987',
      },
      contact: {
        phone: '+1234',
        name: 'Julie',
        parent: {
          contact: {
            phone: '+1234',
            name: 'Julie',
          },
        },
      },
      locale: 'es', //spanish
    };

    return transition.onMatch({ doc: doc }).then(changed => {
      assert.equal(changed, true);
      assert(doc.tasks);
      assert.equal(doc.tasks && doc.tasks.length, 2);

      const msg0 = getMessage(doc, 0);
      assert(msg0);
      assert(msg0.uuid);
      assert(msg0.to);
      assert(msg0.message);
      if (msg0) {
        delete msg0.uuid;
        assert.deepEqual(msg0, {
          to: '+1234',
          message: 'gracias Julie',
        });
      }

      /*
       * Also checks that recipient using doc property value is resolved
       * correctly.
       * */
      const msg1 = getMessage(doc, 1);
      assert(msg1);
      assert(msg1.uuid);
      assert(msg1.to);
      assert(msg1.message);
      if (msg1) {
        delete msg1.uuid;
        assert.deepEqual(msg1, {
          to: '+987',
          message: 'gracias Sam',
        });
      }
    });
  });

  it('registration errors receive patient context', () => {
    const doc = {
      form: 'P',
      fields: {
        patient_id: '123456',
        last_menstrual_period: 60,
      },
      contact: {
        phone: '+1234',
        name: 'Julie',
        parent: {
          contact: {
            phone: '+1234',
            name: 'Julie',
          },
        },
      },
      patient: {
        name: 'Maria',
      },
    };

    return transition.onMatch({ doc: doc }).then(changed => {
      assert.equal(changed, true);

      assert(doc.errors);
      assert.equal(doc.errors.length, 1);
      assert.equal(doc.errors[0].code, 'invalid_last_menstrual_period');
      assert.equal(doc.errors[0].message, 'Something something Maria');
    });
  });

  describe('when manually selecting patient_id', () => {
    beforeEach(() => {
      config.get.returns([
        {
          form: 'WITH',
          events: [
            {
              name: 'on_create',
              trigger: 'add_patient',
              params: { patient_id_field: 'my_patient_id' },
              bool_expr: '',
            },
          ],
          validations: [
            {
              property: 'patient_name',
              rule: 'lenMin(1) && lenMax(100)',
              message: 'Invalid patient name.',
            },
            {
              property: 'my_patient_id',
              rule: 'lenMin(5) && lenMax(13)',
              message: 'Invalid patient id.',
            },
          ],
          messages: [
            {
              message: [
                {
                  content: 'thanks {{contact.name}}',
                  locale: 'en',
                },
                {
                  content: 'gracias {{contact.name}}',
                  locale: 'es',
                },
              ],
              recipient: 'reporting_unit',
            }
          ],
        }
      ]);
    });

    it('should mark as errored when patient_id_field is missing', () => {
      const doc = {
        _id: 'my-form',
        form: 'WITH',
        fields: {
          patient_name: 'Chris'
        },
        from: '+1234',
        reported_date: 1234,
        contact: {
          _id: 'julie', name: 'Julie', phone: '+1234',
          parent: { _id: 'place', type: 'contact', contact_type: 'place' }
        }
      };

      sinon.stub(utils, 'getRegistrations');
      sinon.stub(utils, 'getContactUuid').resolves(false);
      sinon.stub(transitionUtils, 'getUniqueId');
      config.getAll.returns({
        contact_types: [
          { id: 'place' },
          { id: 'person', person: true, parents: ['place'] },
        ]
      });

      sinon.stub(db.medic, 'post').resolves();

      return transition.onMatch({ doc }).then(changed => {
        assert.equal(changed, true);
        assert.equal(doc.errors.length, 1);
        assert.equal(doc.errors[0].code, 'no_provided_patient_id');
        assert.equal(utils.getRegistrations.callCount, 2);
        assert.deepEqual(utils.getRegistrations.args, [[{ id: undefined }], [{ id: undefined }]]);
        assert.equal(utils.getContactUuid.callCount, 1);
        assert.equal(transitionUtils.getUniqueId.callCount, 0);

        assert.equal(db.medic.post.callCount, 1);
        assert.deepEqual(db.medic.post.args[0][0], {
          name: 'Chris',
          created_by: 'julie',
          parent: { _id: 'place' },
          reported_date: 1234,
          type: 'person',
          patient_id: undefined,
          source_id: 'my-form',
        });
      });
    });

    it('should add error when provided patient_id is not unique', () => {
      const doc = {
        _id: 'my-form',
        form: 'WITH',
        fields: {
          patient_name: 'Chris',
          my_patient_id: 'not_unique'
        },
        from: '+1234',
        reported_date: 1234,
        contact: { _id: 'julie', name: 'Julie', phone: '+1234', parent: { _id: 'place', type: 'place' } }
      };

      sinon.stub(utils, 'getRegistrations');
      sinon.stub(utils, 'getContactUuid').resolves(false);
      sinon.stub(transitionUtils, 'getUniqueId');

      sinon.stub(db.medic, 'query');

      config.getAll.returns({
        contact_types: [
          { id: 'place' },
          { id: 'person', person: true, parents: ['place'] }
        ]
      });

      db.medic.query
        .withArgs('medic-client/contacts_by_reference')
        .resolves({
          rows: [{ key: ['shortcode', 'not_unique'], id: 'some_patient' }]
        });

      sinon.stub(db.medic, 'post').resolves();

      return transition.onMatch({ doc }).then(changed => {
        assert.equal(changed, true);
        assert.equal(doc.errors.length, 1);
        assert.equal(doc.errors[0].code, 'provided_patient_id_not_unique');
        assert.equal(utils.getRegistrations.callCount, 2);
        assert.deepEqual(utils.getRegistrations.args, [[{ id: undefined }], [{ id: undefined }]]);
        assert.equal(utils.getContactUuid.callCount, 1);
        assert.equal(transitionUtils.getUniqueId.callCount, 0);

        assert.equal(db.medic.query.callCount, 1);
        assert.deepEqual(db.medic.query.args[0][0], 'medic-client/contacts_by_reference');
        assert.deepEqual(db.medic.query.args[0][1], { key: ['shortcode', 'not_unique'] });

        assert.equal(db.medic.post.callCount, 1);
        assert.deepEqual(db.medic.post.args[0][0], {
          name: 'Chris',
          created_by: 'julie',
          parent: { _id: 'place' },
          reported_date: 1234,
          type: 'person',
          patient_id: undefined,
          source_id: 'my-form',
        });
      });
    });

    it('should create contact with provided patient_id when unique', () => {
      const doc = {
        _id: 'my-form',
        form: 'WITH',
        fields: {
          patient_name: 'Chris',
          my_patient_id: 'unique'
        },
        from: '+1234',
        reported_date: 1234,
        contact: { _id: 'julie', name: 'Julie', phone: '+1234', parent: { _id: 'place', type: 'place' } },
      };

      sinon.stub(utils, 'getRegistrations');
      sinon.stub(utils, 'getContactUuid').resolves(false);
      sinon.stub(transitionUtils, 'getUniqueId');

      config.getAll.returns({
        contact_types: [
          { id: 'place' },
          { id: 'person', person: true, parents: ['place'] }
        ]
      });

      sinon.stub(db.medic, 'query');
      db.medic.query
        .withArgs('medic-client/contacts_by_reference')
        .resolves({
          rows: []
        });

      sinon.stub(db.medic, 'post').resolves();

      return transition.onMatch({ doc }).then(changed => {
        assert.equal(changed, true);
        assert.equal(doc.errors, undefined);
        assert.equal(utils.getRegistrations.callCount, 2);
        assert.deepEqual(utils.getRegistrations.args, [[{ id: undefined }], [{ id: undefined }]]);
        assert.equal(utils.getContactUuid.callCount, 1);
        assert.equal(transitionUtils.getUniqueId.callCount, 0);

        assert.equal(db.medic.query.callCount, 1);
        assert.deepEqual(db.medic.query.args[0][0], 'medic-client/contacts_by_reference');
        assert.deepEqual(db.medic.query.args[0][1], { key: ['shortcode', 'unique'] });

        assert.equal(db.medic.post.callCount, 1);
        assert.deepEqual(db.medic.post.args[0][0], {
          name: 'Chris',
          created_by: 'julie',
          parent: { _id: 'place' },
          reported_date: 1234,
          type: 'person',
          patient_id: 'unique',
          source_id: 'my-form',
        });
      });
    });
  });
});
