const sinon = require('sinon'),
  assert = require('chai').assert,
  transition = require('../../../src/transitions/update_notifications'),
  utils = require('../../../src/lib/utils'),
  mutingUtils = require('../../../src/lib/muting_utils');

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
      assert.equal(
        transition.filter({
          fields: { patient_id: 'x' },
        }),
        false
      );
    });

    it('missing clinic phone does not match', () => {
      assert.equal(
        transition.filter({
          form: 'x',
          fields: { patient_id: 'x' },
        }),
        false
      );
    });

    it('already run does not match', () => {
      assert.equal(
        transition.filter({
          form: 'x',
          fields: { patient_id: 'x' },
          transitions: {
            update_notifications: { last_rev: 9, seq: 1854, ok: true },
          },
        }),
        false
      );
    });

    it('match', () => {
      assert.equal(
        transition.filter({
          form: 'x',
          fields: { patient_id: 'x' },
          type: 'data_record',
        }),
        true
      );
    });

    it('should match when patient_id field is missing #4649', () => {
      assert.equal(
        transition.filter({
          form: 'x',
          type: 'data_record',
        }),
        true
      );
    });

    it('should match when patient_id field is empty #4649', () => {
      assert.equal(
        transition.filter({
          form: 'x',
          type: 'data_record',
          fields: { patient_id: '' },
        }),
        true
      );
    });
  });

  describe('onMatch', () => {
    it('returns false if not on or off form', () => {
      sinon.stub(transition, 'getConfig').returns({
        on_form: 'x',
        off_form: 'y',
      });
      const change = {
        doc: {
          form: 'z',
          type: 'data_record',
        },
      };
      return transition.onMatch(change).then(changed => {
        assert.equal(!!changed, false);
      });
    });

    it('no configured on or off form returns false', () => {
      sinon.stub(transition, 'getConfig').returns({});
      const change = {
        doc: {
          form: 'on',
          type: 'data_record',
          fields: { patient_id: 'x' },
        },
      };
      return transition.onMatch(change).then(changed => {
        assert.equal(!!changed, false);
      });
    });

    it('no configured on or off message runs transition', () => {
      sinon.stub(transition, 'getConfig').returns({ off_form: 'off' });
      const change = {
        doc: {
          form: 'off',
          type: 'data_record',
          fields: { patient_id: 'x' },
        },
      };
      sinon.stub(mutingUtils, 'getContact').resolves({ _id: 'id', patient_id: 'x' });
      sinon.stub(mutingUtils, 'updateMuteState').resolves(true);

      return transition.onMatch(change).then(changed => {
        assert.equal(!!changed, true);
      });
    });

    it('patient not found adds error and response', () => {
      const doc = {
        form: 'on',
        type: 'data_record',
        fields: { patient_id: 'x' },
        contact: { phone: 'x' },
      };

      sinon.stub(transition, 'getConfig').returns({
        messages: [
          {
            event_type: 'on_unmute',
            message: [
              {
                content: 'Thank you {{contact.name}}',
                locale: 'en',
              },
            ],
          },
          {
            event_type: 'patient_not_found',
            message: [
              {
                content: 'not found {{patient_id}}',
                locale: 'en',
              },
            ],
          },
        ],
        on_form: 'on',
      });

      sinon.stub(mutingUtils, 'getContact').rejects({ message: 'contact_not_found' });

      const change = {
        doc: doc,
        form: 'on',
      };
      return transition.onMatch(change).then(changed => {
        assert.equal(changed, true);
        assert.equal(doc.errors.length, 1);
        assert.equal(doc.errors[0].message, 'not found x');
        assert.equal(doc.tasks.length, 1);
        assert.equal(doc.tasks[0].messages[0].message, 'not found x');
        assert.equal(doc.tasks[0].messages[0].to, 'x');
        assert.equal(mutingUtils.getContact.callCount, 1);
        assert.deepEqual(mutingUtils.getContact.args[0], [doc]);
      });
    });

    it('validation failure adds error and response', () => {
      const doc = {
        form: 'on',
        type: 'data_record',
        fields: { patient_id: 'x' },
        contact: { phone: 'x' },
      };

      sinon.stub(transition, 'getConfig').returns({
        validations: {
          join_responses: false,
          list: [
            {
              property: 'patient_id',
              rule: 'regex("^[0-9]{5}$")',
              message: [
                {
                  content: 'patient id needs 5 numbers.',
                  locale: 'en',
                },
              ],
            },
          ],
        },
        messages: [
          {
            event_type: 'on_unmute',
            message: [
              {
                content: 'Thank you {{contact.name}}',
                locale: 'en',
              },
            ],
          },
        ],
        on_form: 'on',
      });

      const change = {
        doc: doc,
        form: 'on',
      };
      return transition.onMatch(change).then(changed => {
        assert.equal(changed, true);
        assert.equal(doc.errors.length, 1);
        assert.equal(doc.errors[0].message, 'patient id needs 5 numbers.');
        assert.equal(doc.tasks.length, 1);
        assert.equal(
          doc.tasks[0].messages[0].message,
          'patient id needs 5 numbers.'
        );
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
          name: 'woot',
        },
      };

      sinon.stub(transition, 'getConfig').returns({
        messages: [
          {
            event_type: 'on_mute',
            message: [
              {
                content:
                  'Thank you {{contact.name}}, no further notifications regarding {{patient_name}} will be sent until you submit START {{patient_id}}.',
                locale: 'en',
              },
            ],
          },
        ],
        off_form: 'off',
      });

      sinon.stub(mutingUtils, 'getContact').resolves({ muted: false, name: 'Agatha' });
      sinon.stub(mutingUtils, 'updateMuteState').resolves(true);

      const change = {
        doc: doc,
        form: 'off',
      };
      return transition.onMatch(change).then(changed => {
        assert.equal(changed, true);
        assert.equal((doc.errors || []).length, 0);
        assert.equal(doc.tasks.length, 1);
        assert.equal(doc.tasks[0].messages[0].message, 'Thank you woot, no further notifications regarding Agatha will be sent until you submit START 123.');
        assert.equal(mutingUtils.getContact.callCount, 1);
        assert.deepEqual(mutingUtils.getContact.args[0], [doc]);
        assert.equal(mutingUtils.updateMuteState.callCount, 1);
        assert.deepEqual(mutingUtils.updateMuteState.args[0], [{ muted: false, name: 'Agatha' }, true]);
      });
    });

    it('mute responds correctly when using translation keys', () => {
      const doc = {
        form: 'off',
        type: 'data_record',
        fields: { patient_id: '123' },
        contact: {
          phone: '+1234',
          name: 'woot',
        },
      };

      sinon.stub(transition, 'getConfig').returns({
        messages: [{
          event_type: 'on_mute',
          translation_key: 'msg.muted'
        }],
        off_form: 'off'
      });

      sinon.stub(mutingUtils, 'getContact').resolves({ muted: false, name: 'Agatha' });
      sinon.stub(mutingUtils, 'updateMuteState').resolves(true);
      const translate = sinon.stub(utils, 'translate').returns('translated value');

      const change = {
        doc: doc,
        form: 'off',
      };
      return transition.onMatch(change).then(changed => {
        assert.equal(changed, true);
        assert.equal((doc.errors || []).length, 0);
        assert.equal(doc.tasks.length, 1);
        assert.equal(doc.tasks[0].messages[0].message, 'translated value');
        assert.equal(translate.callCount, 1);
        assert.equal(translate.args[0][0], 'msg.muted');
      });
    });

    it('unmute responds correctly', () => {
      const doc = {
        form: 'on',
        type: 'data_record',
        fields: { patient_id: '123' },
        contact: {
          phone: '+1234',
          name: 'woot'
        }
      };

      sinon.stub(transition, 'getConfig').returns({
        messages: [{
          event_type: 'on_unmute',
          message: [{
            content: 'Thank you {{contact.name}}, notifications for {{patient_name}} {{patient_id}} have been reactivated.',
            locale: 'en'
          }]
        }],
        on_form: 'on'
      });

      sinon.stub(mutingUtils, 'getContact').resolves({ muted: true, name: 'Agatha' });
      sinon.stub(mutingUtils, 'updateMuteState').resolves();

      const change = {
        doc: doc,
        form: 'off'
      };
      return transition.onMatch(change).then(changed => {
        assert.equal(changed, true);
        assert.equal((doc.errors || []).length, 0);
        assert.equal(doc.tasks.length, 1);
        assert.equal(doc.tasks[0].messages[0].message, 'Thank you woot, notifications for Agatha 123 have been reactivated.');
        assert.equal(mutingUtils.getContact.callCount, 1);
        assert.deepEqual(mutingUtils.getContact.args[0], [doc]);
        assert.equal(mutingUtils.updateMuteState.callCount, 1);
        assert.deepEqual(mutingUtils.updateMuteState.args[0], [{ muted: true, name: 'Agatha' }, false]);
      });
    });

    it('does not update contacts/registrations when already muted', () => {
      const doc = {
        form: 'off',
        type: 'data_record',
        fields: { patient_id: '123' },
        contact: {
          phone: '+1234',
          name: 'woot'
        }
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

      sinon.stub(mutingUtils, 'getContact').resolves({ muted: true, name: 'Agatha' });
      sinon.stub(mutingUtils, 'updateMuteState').resolves();

      return transition.onMatch({ doc }).then(changed => {
        assert.equal(changed, true);
        assert.equal((doc.errors || []).length, 0);
        assert.equal(doc.tasks.length, 1);
        assert.equal(doc.tasks[0].messages[0].message, 'Thank you woot, no further notifications regarding Agatha will be sent until you submit START 123.');
        assert.equal(mutingUtils.getContact.callCount, 1);
        assert.deepEqual(mutingUtils.getContact.args[0], [doc]);
        assert.equal(mutingUtils.updateMuteState.callCount, 0);
      });
    });

    it('does not update contacts/registrations when already unmuted', () => {
      const doc = {
        form: 'on',
        type: 'data_record',
        fields: { patient_id: '123' },
        contact: {
          phone: '+1234',
          name: 'woot'
        }
      };

      sinon.stub(transition, 'getConfig').returns({
        messages: [{
          event_type: 'on_unmute',
          message: [{
            content: 'Thank you {{contact.name}}, notifications for {{patient_name}} {{patient_id}} have been reactivated.',
            locale: 'en'
          }]
        }],
        on_form: 'on'
      });

      sinon.stub(mutingUtils, 'getContact').resolves({ name: 'Agatha' });
      sinon.stub(mutingUtils, 'updateMuteState').resolves();

      return transition.onMatch({ doc }).then(changed => {
        assert.equal(changed, true);
        assert.equal((doc.errors || []).length, 0);
        assert.equal(doc.tasks.length, 1);
        assert.equal(doc.tasks[0].messages[0].message, 'Thank you woot, notifications for Agatha 123 have been reactivated.');
        assert.equal(mutingUtils.getContact.callCount, 1);
        assert.deepEqual(mutingUtils.getContact.args[0], [doc]);
        assert.equal(mutingUtils.updateMuteState.callCount, 0);
      });
    });

    it('should process the `on_mute` even when event_type messages not found #3362', () => {
      sinon.stub(transition, 'getConfig').returns({
        messages: [],
        off_form: 'off'
      });

      const doc = {
        form: 'off',
        type: 'data_record',
        fields: { patient_id: '123' },
        contact: {
          phone: '+1234',
          name: 'woot'
        }
      };

      sinon.stub(mutingUtils, 'getContact').resolves({ name: 'Agatha' });
      sinon.stub(mutingUtils, 'updateMuteState').resolves(true);

      return transition.onMatch({ doc }).then(changed => {
        assert.equal(changed, true);
        assert.equal(doc.errors.length, 1);
        assert.equal(doc.tasks, undefined);
        assert.equal(mutingUtils.getContact.callCount, 1);
        assert.deepEqual(mutingUtils.getContact.args[0], [doc]);
        assert.equal(mutingUtils.updateMuteState.callCount, 1);
        assert.deepEqual(mutingUtils.updateMuteState.args[0], [{ name: 'Agatha' }, true]);
        assert.equal(
          doc.errors[0].message,
          'Failed to complete notification request, event type "on_mute" misconfigured.'
        );
      });
    });

    it('should process the `on_unmute` even when event_type messages not found #3362', () => {
      sinon.stub(transition, 'getConfig').returns({
        messages: [],
        on_form: 'on'
      });

      const doc = {
        form: 'on',
        type: 'data_record',
        fields: { patient_id: '123' },
        contact: {
          phone: '+1234',
          name: 'woot'
        }
      };

      sinon.stub(mutingUtils, 'getContact').resolves({ name: 'Agatha', muted: 123456 });
      sinon.stub(mutingUtils, 'updateMuteState').resolves(true);

      return transition.onMatch({ doc }).then(changed => {
        assert.equal(changed, true);
        assert.equal(doc.errors.length, 1);
        assert.equal(doc.tasks, undefined);
        assert.equal(mutingUtils.getContact.callCount, 1);
        assert.deepEqual(mutingUtils.getContact.args[0], [doc]);
        assert.equal(mutingUtils.updateMuteState.callCount, 1);
        assert.deepEqual(mutingUtils.updateMuteState.args[0], [{ name: 'Agatha', muted: 123456 }, false]);
        assert.equal(
          doc.errors[0].message,
          'Failed to complete notification request, event type "on_unmute" misconfigured.'
        );
      });
    });
  });

  describe('add error', () => {
    it('when event type not found', () => {
      const doc = {};
      const config = {
        messages: [
          {
            event_type: 'biz',
            message: [
              {
                content: 'baz',
                locale: 'en',
              },
            ],
          },
        ],
      };
      transition._addErr('foo', config, doc);
      assert.equal(doc.errors[0].code, 'invalid_report');
      assert.equal(
        doc.errors[0].message,
        'Failed to complete notification request, event type "foo" misconfigured.'
      );
    });

    it('when event type message not found', () => {
      const doc = {};
      const config = {
        messages: [
          {
            event_type: 'foo',
            message: [],
          },
        ],
      };
      transition._addErr('foo', config, doc);
      assert.equal(doc.errors[0].code, 'invalid_report');
      assert.equal(
        doc.errors[0].message,
        'Failed to complete notification request, event type "foo" misconfigured.'
      );
    });

    it('when event type message not found', () => {
      const doc = { form: 'off' };
      const config = {
        messages: [
          {
            event_type: 'foo',
            message: [],
          },
        ],
      };
      transition._addErr('foo', config, doc);
      assert.equal(doc.errors[0].code, 'invalid_report');
      assert.equal(
        doc.errors[0].message,
        'Failed to complete notification request, event type "foo" misconfigured.'
      );
    });
  });

  describe('add message', () => {
    it('creates error when event type not found', () => {
      const doc = {};
      const config = {
        messages: [
          {
            event_type: 'biz',
            message: [
              {
                content: 'baz',
                locale: 'en',
              },
            ],
          },
        ],
      };
      transition._addMsg('foo', config, doc);
      assert.equal(doc.errors[0].code, 'invalid_report');
      assert.equal(
        doc.errors[0].message,
        'Failed to complete notification request, event type "foo" misconfigured.'
      );
    });
  });
});
