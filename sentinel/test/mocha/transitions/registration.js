const should = require('chai').should();
const sinon = require('sinon').sandbox.create();

describe('registrations', () => {
  const transition = require('../../../transitions/registration'),
        messages = require('../../../lib/messages'),
        utils = require('../../../lib/utils');

  afterEach(done => {
    sinon.restore();
    done();
  });

  describe('addMessages', () => {
    it('prepops and passes the right information to messages.addMessage', done => {
      const testPhone = '1234',
            testMessage = 'A Test Message',
            testRegistration = 'some registrations',
            testPatient = 'a patient contact';

      sinon.stub(messages, 'getRecipientPhone').returns(testPhone);
      sinon.stub(messages, 'getMessage').returns(testMessage);
      const addMessage = sinon.stub(messages, 'addMessage');

      sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, testRegistration);
      sinon.stub(utils, 'getPatientContact').callsArgWith(2, null, testPatient);

      const testConfig = {
        messages: [{
        },
        {
          event_type: 'report_accepted'
        }]
      };
      const testDoc = {
        fields: {
          patient_id: '12345'
        }
      };

      transition.addMessages({}, testConfig, testDoc, err => {
        should.not.exist(err);
        // Registration will send messages with no event_type
        addMessage.callCount.should.equal(2);

        const expected = {
          doc: testDoc,
          phone: testPhone,
          message: testMessage,
          templateContext: { next_msg: { minutes: 0, hours: 0, days: 0, weeks: 0, months: 0, years: 0 } },
          registrations: testRegistration,
          patient: testPatient
        };

        addMessage.args[0][0].should.deep.equal(expected);
        addMessage.args[1][0].should.deep.equal(expected);
        done();
      });
    });
    it('supports ignoring messages based on bool_expr', done => {
      const testPhone = '1234',
            testMessage = 'A Test Message',
            testRegistration = 'some registrations',
            testPatient = 'a patient contact';

      sinon.stub(messages, 'getRecipientPhone').returns(testPhone);
      sinon.stub(messages, 'getMessage').returns(testMessage);
      const addMessage = sinon.stub(messages, 'addMessage');

      sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, testRegistration);
      sinon.stub(utils, 'getPatientContact').callsArgWith(2, null, testPatient);

      const testConfig = {
        messages: [{
        },
        {
          event_type: 'report_accepted',
          bool_expr: '1 === 2'
        }]
      };
      const testDoc = {
        fields: {
          patient_id: '12345'
        }
      };

      transition.addMessages({}, testConfig, testDoc, err => {
        should.not.exist(err);
        addMessage.callCount.should.equal(1);

        const expected = {
          doc: testDoc,
          phone: testPhone,
          message: testMessage,
          templateContext: { next_msg: { minutes: 0, hours: 0, days: 0, weeks: 0, months: 0, years: 0 } },
          registrations: testRegistration,
          patient: testPatient
        };

        addMessage.args[0][0].should.deep.equal(expected);
        done();
      });
    });
  });
});
