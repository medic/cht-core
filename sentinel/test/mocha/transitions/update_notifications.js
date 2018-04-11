const sinon = require('sinon').sandbox.create(),
      transition = require('../../../transitions/update_notifications'),
      db = require('../../../db'),
      utils = require('../../../lib/utils');

describe('update_notifications', () => {

  afterEach(done => {
    sinon.restore();
    done();
  });

  describe('filter', () => {

    it('empty doc does not match', () => {
      transition.filter({}).should.equal(false);
    });

    it('missing form does not match', () => {
      transition.filter({
        fields: { patient_id: 'x' }
      }).should.equal(false);
    });

    it('missing clinic phone does not match', () => {
      transition.filter({
        form: 'x',
        fields: { patient_id: 'x' }
      }).should.equal(false);
    });

    it('already run does not match', () => {
      transition.filter({
        form: 'x',
        fields: { patient_id: 'x' },
        transitions: {
          update_notifications: { last_rev: 9, seq: 1854, ok: true }
        }
      }).should.equal(false);
    });

    it('match', () => {
      transition.filter({
        form: 'x',
        fields: { patient_id: 'x' },
        type: 'data_record'
      }).should.equal(true);
    });

  });

  describe('onMatch', () => {

    it('returns false if not on or off form', done => {
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
      transition.onMatch(change).then(changed => {
        (!!changed).should.equal(false);
        done();
      });
    });

    it('no configured on or off form returns false', done => {
      sinon.stub(transition, 'getConfig').returns({});
      const change = {
        doc: {
          form: 'on',
          type: 'data_record',
          fields: { patient_id: 'x' }
        }
      };
      transition.onMatch(change).then(changed => {
        (!!changed).should.equal(false);
        done();
      });
    });

    it('no configured on or off message returns false', done => {
      sinon.stub(transition, 'getConfig').returns({ off_form: 'off' });
      const change = {
        doc: {
          form: 'off',
          type: 'data_record',
          fields: { patient_id: 'x' }
        }
      };
      transition.onMatch(change).then(changed => {
        (!!changed).should.equal(false);
        done();
      });
    });

    it('registration not found adds error and response', done => {
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
      transition.onMatch(change).then(changed => {
        changed.should.equal(true);
        doc.errors.length.should.equal(1);
        doc.errors[0].message.should.equal('not found x');
        doc.tasks.length.should.equal(1);
        doc.tasks[0].messages[0].message.should.equal('not found x');
        doc.tasks[0].messages[0].to.should.equal('x');
        done();
      });
    });

    it('patient not found adds error and response', done => {
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
      transition.onMatch(change).then(changed => {
        changed.should.equal(true);
        doc.errors.length.should.equal(1);
        doc.errors[0].message.should.equal('not found x');
        doc.tasks.length.should.equal(1);
        doc.tasks[0].messages[0].message.should.equal('not found x');
        doc.tasks[0].messages[0].to.should.equal('x');
        done();
      });
    });

    it('validation failure adds error and response', done => {

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
      transition.onMatch(change).then(changed => {
        changed.should.equal(true);
        doc.errors.length.should.equal(1);
        doc.errors[0].message.should.equal('patient id needs 5 numbers.');
        doc.tasks.length.should.equal(1);
        doc.tasks[0].messages[0].message.should.equal('patient id needs 5 numbers.');
        doc.tasks[0].messages[0].to.should.equal('x');
        done();
      });
    });

    it('mute responds correctly', done => {

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
      transition.onMatch(change).then(changed => {
        changed.should.equal(true);
        (doc.errors || []).length.should.equal(0);
        doc.tasks.length.should.equal(1);
        doc.tasks[0].messages[0].message.should.equal('Thank you woot, no further notifications regarding Agatha will be sent until you submit START 123.');
        regDoc.scheduled_tasks[0].state.should.equal('muted');
        done();
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
      doc.errors[0].code.should.equal('invalid_report');
      doc.errors[0].message.should.equal('Failed to complete notification request, event type "foo" misconfigured.');
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
      doc.errors[0].code.should.equal('invalid_report');
      doc.errors[0].message.should.equal('Failed to complete notification request, event type "foo" misconfigured.');
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
      doc.errors[0].code.should.equal('invalid_report');
      doc.errors[0].message.should.equal('Failed to complete notification request, event type "foo" misconfigured.');
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
      doc.errors[0].code.should.equal('invalid_report');
      doc.errors[0].message.should.equal('Failed to complete notification request, event type "foo" misconfigured.');
    });

  });

});
