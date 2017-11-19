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
            testMessage1 = {
              message: 'A Test Message 1',
              recipient: testPhone,
              event_type: 'report_accepted'
            },
            testMessage2 = {
              message: 'A Test Message 2',
              recipient: testPhone,
              event_type: 'report_accepted'
            },
            testRegistration = 'some registrations',
            testPatient = 'a patient contact';

      const addMessage = sinon.stub(messages, 'addMessage');

      sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, testRegistration);

      const testConfig = { messages: [ testMessage1, testMessage2 ] };
      const testDoc = {
        fields: {
          patient_id: '12345'
        },
        patient: testPatient
      };

      transition.addMessages({}, testConfig, testDoc, err => {
        should.not.exist(err);
        // Registration will send messages with no event_type
        addMessage.callCount.should.equal(2);
        
        const expectedContext = {
          patient: testPatient,
          registrations: testRegistration,
          templateContext: {
            next_msg: { minutes: 0, hours: 0, days: 0, weeks: 0, months: 0, years: 0 }
          }
        };
        addMessage.args[0][0].should.equal(testDoc);
        addMessage.args[0][1].should.equal(testMessage1);
        addMessage.args[0][2].should.equal(testPhone);
        addMessage.args[0][3].should.deep.equal(expectedContext);
        addMessage.args[1][0].should.equal(testDoc);
        addMessage.args[1][1].should.equal(testMessage2);
        addMessage.args[1][2].should.equal(testPhone);
        addMessage.args[1][3].should.deep.equal(expectedContext);
        done();
      });
    });
    it('supports ignoring messages based on bool_expr', done => {
      const testPhone = '1234',
            testMessage1 = {
              message: 'A Test Message 1',
              recipient: testPhone,
              event_type: 'report_accepted'
            },
            testMessage2 = {
              message: 'A Test Message 2',
              recipient: testPhone,
              event_type: 'report_accepted',
              bool_expr: '1 === 2'
            },
            testRegistration = 'some registrations',
            testPatient = 'a patient contact';

      const addMessage = sinon.stub(messages, 'addMessage');

      sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, testRegistration);

      const testConfig = { messages: [ testMessage1, testMessage2 ] };
      const testDoc = {
        fields: {
          patient_id: '12345'
        },
        patient: testPatient
      };

      transition.addMessages({}, testConfig, testDoc, err => {
        should.not.exist(err);
        addMessage.callCount.should.equal(1);
        const expectedContext = {
          patient: testPatient,
          registrations: testRegistration,
          templateContext: {
            next_msg: { minutes: 0, hours: 0, days: 0, weeks: 0, months: 0, years: 0 }
          }
        };
        addMessage.args[0][0].should.equal(testDoc);
        addMessage.args[0][1].should.equal(testMessage1);
        addMessage.args[0][2].should.equal(testPhone);
        addMessage.args[0][3].should.deep.equal(expectedContext);
        done();
      });
    });
  });
});
