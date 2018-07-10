const sinon = require('sinon'),
      assert = require('chai').assert,
      transition = require('../../../src/transitions/update_notifications'),
      db = require('../../../src/db-nano'),
      utils = require('../../../src/lib/utils');

describe('update_notifications', () => {

  afterEach(done => {
    sinon.restore();
    done();
  });

  describe('filter', () => {

    it('empty doc does not match', () => {
      assert.equal(transition.filter({}), false);
    });

    it('missing form does not match', () => {
      assert.equal(transition.filter({
        fields: { patient_id: 'x' }
      }), false);
    });

    it('missing clinic phone does not match', () => {
      assert.equal(transition.filter({
        form: 'x',
        fields: { patient_id: 'x' }
      }), false);
    });

    it('already run does not match', () => {
      assert.equal(transition.filter({
        form: 'x',
        fields: { patient_id: 'x' },
        transitions: {
          update_notifications: { last_rev: 9, seq: 1854, ok: true }
        }
      }), false);
    });

    it('match', () => {
      assert.equal(transition.filter({
        form: 'x',
        fields: { patient_id: 'x' },
        type: 'data_record'
      }), true);
    });

  });

  describe('onMatch', () => {

    it('returns false if not on or off form', () => {
      sinon.stub(transition, 'getConfig').returns({
        on_form: 'x',
        off_form: 'y'
      });
      const change = {
        doc: {
          form: 'z',
          type: 'data_record'
        }
      };
      return transition.onMatch(change).then(changed => {
        assert.equal((!!changed), false);
      });
    });

    it('no configured on or off form returns false', () => {
      sinon.stub(transition, 'getConfig').returns({});
      const change = {
        doc: {
          form: 'on',
          type: 'data_record',
          fields: { patient_id: 'x' }
        }
      };
      return transition.onMatch(change).then(changed => {
        assert.equal((!!changed), false);
      });
    });

    it('no configured on or off message returns false', () => {
      sinon.stub(transition, 'getConfig').returns({ off_form: 'off' });
      const change = {
        doc: {
          form: 'off',
          type: 'data_record',
          fields: { patient_id: 'x' }
        }
      };
      return transition.onMatch(change).then(changed => {
        assert.equal((!!changed), false);
      });
    });

    it('registration not found adds error and response', () => {
      const doc = {
        form: 'on',
        type: 'data_record',
        fields: { patient_id: 'x' },
        contact: { phone: 'x' }
      };

      sinon.stub(transition, 'getConfig').returns({
        messages: [{
          event_type: 'on_unmute',
          message: [{
            content: 'Thank you {{contact.name}}',
            locale: 'en'
          }]
        }, {
          event_type: 'patient_not_found',
          message: [{
            content: 'not found {{patient_id}}',
            locale: 'en'
          }]
        }],
        on_form: 'on'
      });
      sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, []);
      sinon.stub(utils, 'getPatientContact').callsArgWithAsync(2, null, {});

      const change = {
        doc: doc,
        form: 'on'
      };
      return transition.onMatch(change).then(changed => {
        assert.equal(changed, true);
        assert.equal(doc.errors.length, 1);
        assert.equal(doc.errors[0].message, 'not found x');
        assert.equal(doc.tasks.length, 1);
        assert.equal(doc.tasks[0].messages[0].message, 'not found x');
        assert.equal(doc.tasks[0].messages[0].to, 'x');
      });
    });

    it('patient not found adds error and response', () => {
      const doc = {
        form: 'on',
        type: 'data_record',
        fields: { patient_id: 'x' },
        contact: { phone: 'x' }
      };

      sinon.stub(transition, 'getConfig').returns({
        messages: [{
          event_type: 'on_unmute',
          message: [{
            content: 'Thank you {{contact.name}}',
            locale: 'en'
          }]
        }, {
          event_type: 'patient_not_found',
          message: [{
            content: 'not found {{patient_id}}',
            locale: 'en'
          }]
        }],
        on_form: 'on'
      });
      sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, ['a registration']);
      sinon.stub(utils, 'getPatientContact').callsArgWithAsync(2, null, null);

      const change = {
        doc: doc,
        form: 'on'
      };
      return transition.onMatch(change).then(changed => {
        assert.equal(changed, true);
        assert.equal(doc.errors.length, 1);
        assert.equal(doc.errors[0].message, 'not found x');
        assert.equal(doc.tasks.length, 1);
        assert.equal(doc.tasks[0].messages[0].message, 'not found x');
        assert.equal(doc.tasks[0].messages[0].to, 'x');
      });
    });

    it('validation failure adds error and response', () => {

      const doc = {
        form: 'on',
        type: 'data_record',
        fields: { patient_id: 'x' },
        contact: { phone: 'x' }
      };

      sinon.stub(transition, 'getConfig').returns({
        validations: {
          join_responses: false,
          list: [
            {
              property: 'patient_id',
              rule: 'regex("^[0-9]{5}$")',
              message: [{
                content: 'patient id needs 5 numbers.',
                locale: 'en'
              }]
            }
          ]
        },
        messages: [{
          event_type: 'on_unmute',
          message: [{
            content: 'Thank you {{contact.name}}',
            locale: 'en'
          }]
        }],
        on_form: 'on'
      });

      sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, [{
        _id: 'x'
      }]);

      const change = {
        doc: doc,
        form: 'on'
      };
      return transition.onMatch(change).then(changed => {
        assert.equal(changed, true);
        assert.equal(doc.errors.length, 1);
        assert.equal(doc.errors[0].message, 'patient id needs 5 numbers.');
        assert.equal(doc.tasks.length, 1);
        assert.equal(doc.tasks[0].messages[0].message, 'patient id needs 5 numbers.');
        assert.equal(doc.tasks[0].messages[0].to, 'x');
      });
    });

    it('mute responds correctly', () => {

      const doc = {
        form: 'off',
        type: 'data_record',
        fields: { patient_id: '123' },
        contact: {
          phone: '+1234',
          name: 'woot'
        }
      };

      const regDoc = {
        fields: {
          patient_name: 'Agatha'
        },
        scheduled_tasks: [{
          state: 'scheduled'
        }]
      };

      sinon.stub(transition, 'getConfig').returns({
        messages: [{
          event_type: 'on_mute',
          message: [{
            content: 'Thank you {{contact.name}}, no further notifications regarding {{patient_name}} will be sent until you submit START {{patient_id}}.',
            locale: 'en'
          }]
        }],
        off_form: 'off'
      });

      sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, [regDoc]);
      sinon.stub(utils, 'getPatientContact').callsArgWithAsync(2, null, []);
      sinon.stub(db.audit, 'saveDoc').callsArg(1);

      const change = {
        doc: doc,
        form: 'off'
      };
      return transition.onMatch(change).then(changed => {
        assert.equal(changed, true);
        assert.equal((doc.errors || []).length, 0);
        assert.equal(doc.tasks.length, 1);
        assert.equal(doc.tasks[0].messages[0].message, 'Thank you woot, no further notifications regarding Agatha will be sent until you submit START 123.');
        assert.equal(regDoc.scheduled_tasks[0].state, 'muted');
      });
    });

    it('mute responds correctly when using translation keys', () => {

      const doc = {
        form: 'off',
        type: 'data_record',
        fields: { patient_id: '123' },
        contact: {
          phone: '+1234',
          name: 'woot'
        }
      };

      const regDoc = {
        fields: {
          patient_name: 'Agatha'
        },
        scheduled_tasks: [{
          state: 'scheduled'
        }]
      };

      sinon.stub(transition, 'getConfig').returns({
        messages: [{
          event_type: 'on_mute',
          translation_key: 'msg.muted'
        }],
        off_form: 'off'
      });

      sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, [regDoc]);
      sinon.stub(utils, 'getPatientContact').callsArgWithAsync(2, null, []);
      const translate = sinon.stub(utils, 'translate').returns('translated value');
      sinon.stub(db.audit, 'saveDoc').callsArg(1);

      const change = {
        doc: doc,
        form: 'off'
      };
      return transition.onMatch(change).then(changed => {
        assert.equal(changed, true);
        assert.equal((doc.errors || []).length, 0);
        assert.equal(doc.tasks.length, 1);
        assert.equal(doc.tasks[0].messages[0].message, 'translated value');
        assert.equal(translate.callCount, 1);
        assert.equal(translate.args[0][0], 'msg.muted');
        assert.equal(regDoc.scheduled_tasks[0].state, 'muted');
      });
    });

  });

  describe('add error', () => {

    it('when event type not found', () => {
      const doc = {};
      const config = {
        messages: [{
          event_type: 'biz',
          message: [{
            content: 'baz',
            locale: 'en'
          }]
        }]
      };
      transition._addErr('foo', config, doc);
      assert.equal(doc.errors[0].code, 'invalid_report');
      assert.equal(doc.errors[0].message, 'Failed to complete notification request, event type "foo" misconfigured.');
    });

    it('when event type message not found', () => {
      const doc = {};
      const config = {
        messages: [{
          event_type: 'foo',
          message: []
        }]
      };
      transition._addErr('foo', config, doc);
      assert.equal(doc.errors[0].code, 'invalid_report');
      assert.equal(doc.errors[0].message, 'Failed to complete notification request, event type "foo" misconfigured.');
    });

    it('when event type message not found', () => {
      const doc = {};
      const config = {
        messages: [{
          event_type: 'foo',
          message: []
        }]
      };
      transition._addErr('foo', config, doc);
      assert.equal(doc.errors[0].code, 'invalid_report');
      assert.equal(doc.errors[0].message, 'Failed to complete notification request, event type "foo" misconfigured.');
    });

  });

  describe('add message', () => {

    it('creates error when event type not found', () => {
      const doc = {};
      const config = {
        messages: [{
          event_type: 'biz',
          message: [{
            content: 'baz',
            locale: 'en'
          }]
        }]
      };
      transition._addMsg('foo', config, doc);
      assert.equal(doc.errors[0].code, 'invalid_report');
      assert.equal(doc.errors[0].message, 'Failed to complete notification request, event type "foo" misconfigured.');
    });

  });

});
