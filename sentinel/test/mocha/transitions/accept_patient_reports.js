require('chai').should();
const sinon = require('sinon').sandbox.create(),
      moment = require('moment');

describe('accept_patient_reports', () => {
  const transition = require('../../../transitions/accept_patient_reports'),
        messages = require('../../../lib/messages');

  afterEach(done => {
    sinon.restore();
    done();
  });

  describe('silenceReminders', () => {
    it('Sets tasks to cleared and saves them', done => {
      const registration = {
        _id: 'test-registration',
        scheduled_tasks: [
          {
            state: 'scheduled'
          },
          {
            state: 'scheduled'
          },
          {
            state: 'pending'
          },
        ]
      };

      sinon.stub(transition, '_findToClear').returns(registration.scheduled_tasks);

      const audit = {
        saveDoc: registration => {
          registration._id.should.equal('test-registration');
          registration.scheduled_tasks.length.should.equal(3);
          registration.scheduled_tasks[0].state.should.equal('cleared');
          registration.scheduled_tasks[1].state.should.equal('cleared');
          registration.scheduled_tasks[2].state.should.equal('cleared');
          done();
        }
      };

      transition._silenceReminders(audit, registration);
    });
  });
  describe('findToClear', () => {
    const ids = ts => ts.map(t => t._id);

    it('returns no tasks on registrations with none', () => {
      const registration = {
        scheduled_tasks: []
      };

      transition._findToClear(registration, new Date(), {silence_type: 'test'}).should.deep.equal([]);
      transition._findToClear(registration, new Date(), {silence_type: 'test', silence_for: '1000 years'}).should.deep.equal([]);
    });
    describe('without silence_for range', () => {
      const now = moment();
      const registration = {
        scheduled_tasks: [
          { _id: 1, due: now.clone().subtract(1, 'days'), state: 'pending',       group: 1, type: 'x' },
          { _id: 2, due: now.clone().add(     1, 'days'), state: 'scheduled',     group: 1, type: 'x' },
          { _id: 3, due: now.clone().add(     1, 'days'), state: 'scheduled',     group: 2, type: 'x' },
          { _id: 4, due: now.clone().add(     1, 'days'), state: 'scheduled',     group: 2, type: 'y' },
          { _id: 5, due: now.clone().add(     1, 'days'), state: 'not-scheduled', group: 2, type: 'y' },
          { _id: 6, due: now.clone().add(     1, 'days'), state: 'scheduled',     group: 3, type: 'y' }
        ]};

      it('returns all scheduled or pending scheduled_tasks of the given type', () => {
        const results = transition._findToClear(registration, now.valueOf(), {silence_type: 'x'});
        ids(results).should.deep.equal([1, 2, 3]);
      });
      it('or multiple types', () => {
        const results = transition._findToClear(registration, now.valueOf(), {silence_type: 'x,y'});
        ids(results).should.deep.equal([1, 2, 3, 4, 6]);
      });
    });
    describe('with silence_for range', () => {
      const now = moment();
      const silence_for = '5 days';
      const registration = {
        scheduled_tasks: [
          // A group with a task before, and after, but not within range
          { _id: 1,  due: now.clone().subtract(1, 'days'), state: 'sent',      group: 1,  type: 'x'},
          { _id: 2,  due: now.clone().add(     9, 'days'), state: 'scheduled', group: 1,  type: 'x'},
          // A group with a task in range and subsequent tasks out of range
          { _id: 3,  due: now.clone().add(     1, 'days'), state: 'pending',   group: 2,  type: 'x'},
          { _id: 4,  due: now.clone().add(     9, 'days'), state: 'scheduled', group: 2,  type: 'x'},
          // A group that overlaps with the above group and is also a valid group
          { _id: 31, due: now.clone().add(     2, 'days'), state: 'scheduled', group: 21, type: 'x'},
          { _id: 41, due: now.clone().add(    10, 'days'), state: 'scheduled', group: 21, type: 'x'},
          // A group with no tasks in range
          { _id: 5,  due: now.clone().add(     9, 'days'), state: 'scheduled', group: 3,  type: 'x'},
          // A group in range but of a different type
          { _id: 6,  due: now.clone().add(     1, 'days'), state: 'scheduled', group: 2,  type: 'y'},
          { _id: 7,  due: now.clone().add(     9, 'days'), state: 'scheduled', group: 2,  type: 'y'},
        ]
      };
      it('returns all scheduled or pending scheduled_tasks that are in groups with at least one task in the given range', () => {
        const results = transition._findToClear(registration, now.valueOf(), {silence_type: 'x', silence_for: silence_for});
        ids(results).should.deep.equal([1, 2, 3, 4, 31, 41]);
      });
      it('also with multiple types', () => {
        const results = transition._findToClear(registration, now.valueOf(), {silence_type: 'x,y', silence_for: silence_for});
        ids(results).should.deep.equal([1, 2, 3, 4, 31, 41, 6, 7]);
      });
    });
  });
  describe('addMessageToDoc', () => {
    it('Does not add a message if the bool_expr fails', () => {
      const doc = {};
      const config = {messages: [{
        event_type: 'report_accepted',
        bool_expr: 'false'
      }]};
      const patient = {};

      const stub = sinon.stub(messages, 'addMessage');
      transition._addMessageToDoc(doc, config, [], patient);
      stub.callCount.should.equal(0);
    });
    it('Adds a message if the bool_expr passes', () => {
      const doc = {};
      const config = {messages: [{
        event_type: 'report_accepted',
        bool_expr: 'true'
      }]};
      const patient = {};

      const stub = sinon.stub(messages, 'addMessage');
      transition._addMessageToDoc(doc, config, [], patient);
      stub.callCount.should.equal(1);
    });
  });
});
