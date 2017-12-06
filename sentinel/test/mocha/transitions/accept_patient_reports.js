require('chai').should();
const sinon = require('sinon').sandbox.create(),
      moment = require('moment'),
      utils = require('../../../lib/utils'),
      config = require('../../../config');

describe('accept_patient_reports', () => {
  const transition = require('../../../transitions/accept_patient_reports'),
        messages = require('../../../lib/messages');

  afterEach(done => {
    sinon.restore();
    done();
  });

  describe('filter', () => {
    it('validation', () => {
      transition.filter({}).should.equal(false);
      transition.filter({ form: 'x' }).should.equal(false);
    });
  });

  describe('onMatch', () => {

    it('callback empty if form not included', done => {
      sinon.stub(config, 'get').returns([ { form: 'x' }, { form: 'z' } ]);

      transition.onMatch({
        doc: {
          form: 'y'
        }
      }, {}, {}, (err, changed) => {
        (typeof err).should.equal('undefined');
        (typeof changed).should.equal('undefined');
        done();
      });
    });

    it('with no patient id adds error msg and response', done => {
      sinon.stub(config, 'get').returns([ { form: 'x' }, { form: 'z' } ]);
      sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);

      const doc = {
        form: 'x',
        fields: { patient_id: 'x' }
      };

      transition.onMatch({
        doc: doc
      }, {}, {}, () => {
        doc.errors.length.should.equal(1);
        doc.errors[0].message.should.equal('messages.generic.registration_not_found');
        done();
      });
    });

  });

  describe('handleReport', () => {

    // Because patients can be created through the UI and not neccessarily have
    // a registration at all
    it('with no registrations does not error', done => {
      const doc = {
        fields: { patient_id: 'x' },
        from: '+123'
      };
      sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);

      const config = {
        messages: [{
          event_type: 'registration_not_found',
          message: [{
            content: 'not found {{patient_id}}',
            locale: 'en'
          }],
          recipient: 'reporting_unit'
        }]
      };

      transition._handleReport(null, null, doc, config, () => {
        (typeof doc.errors).should.equal('undefined');
        (typeof doc.tasks).should.equal('undefined');
        done();
      });
    });

    it('with patient adds reply', done => {
      const patient = { patient_name: 'Archibald' };
      const doc = {
        fields: { patient_id: '559' },
        contact: {
          phone: '+1234',
          name: 'woot',
          parent: {
            contact: {
              phone: '+1234',
              name: 'woot'
            }
          }
        },
        patient: patient
      };
      sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);
      const config = {
        messages: [{
          event_type: 'report_accepted',
          message: [{
            content: 'Thank you, {{contact.name}}. ANC visit for {{patient_name}} ({{patient_id}}) has been recorded.',
            locale: 'en'
          }],
          recipient: 'reporting_unit'
        }]
      };
      transition._handleReport(null, null, doc, config, () => {
        doc.tasks[0].messages[0].message.should.equal(
          'Thank you, woot. ANC visit for Archibald (559) has been recorded.'
        );
        done();
      });
    });

    it('adding silence_type to handleReport calls _silenceReminders', done => {
      sinon.stub(transition, '_silenceReminders').callsArgWith(4);
      const doc = { _id: 'a', fields: { patient_id: 'x' } };
      const config = { silence_type: 'x', messages: [] };
      const registrations = [
        { id: 'a' }, // should not be silenced as it's the doc being processed
        { id: 'b' }, // should be silenced
        { id: 'c' }  // should be silenced
      ];
      sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, registrations);
      transition._handleReport(null, null, doc, config, (err, complete) => {
        complete.should.equal(true);
        transition._silenceReminders.callCount.should.equal(2);
        transition._silenceReminders.args[0][1].id.should.equal('b');
        transition._silenceReminders.args[0][2]._id.should.equal('a');
        transition._silenceReminders.args[1][1].id.should.equal('c');
        transition._silenceReminders.args[1][2]._id.should.equal('a');
        done();
      });
    });

  });

  describe('silenceReminders', () => {
    it('Sets tasks to cleared and saves them', done => {
      const reportId = 'reportid';
      const report = {
        _id: reportId,
        reported_date: 123
      };
      const registration = {
        _id: 'test-registration',
        scheduled_tasks: [
          { state: 'scheduled' },
          { state: 'scheduled' },
          { state: 'pending' }
        ]
      };

      sinon.stub(transition, '_findToClear').returns(registration.scheduled_tasks);

      const audit = {
        saveDoc: registration => {
          registration._id.should.equal('test-registration');
          registration.scheduled_tasks.length.should.equal(3);
          registration.scheduled_tasks[0].state.should.equal('cleared');
          registration.scheduled_tasks[0].cleared_by.should.equal(reportId);
          registration.scheduled_tasks[1].state.should.equal('cleared');
          registration.scheduled_tasks[1].cleared_by.should.equal(reportId);
          registration.scheduled_tasks[2].state.should.equal('cleared');
          registration.scheduled_tasks[2].cleared_by.should.equal(reportId);
          done();
        }
      };

      transition._silenceReminders(audit, registration, report);
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
