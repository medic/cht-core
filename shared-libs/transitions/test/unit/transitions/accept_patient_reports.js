const sinon = require('sinon');
const should = require('chai').should();
const moment = require('moment');
const db = require('../../../src/db');
const utils = require('../../../src/lib/utils');
const config = require('../../../src/config');
const messages = require('../../../src/lib/messages');
const validation = require('@medic/validation');

describe('accept_patient_reports', () => {
  let transition;

  beforeEach(() => {
    config.init({
      getAll: sinon.stub().returns({}),
      get: sinon.stub(),
      getTranslations: sinon.stub().returns({})
    });
    transition = require('../../../src/transitions/accept_patient_reports');
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  describe('filter', () => {
    it('empty doc returns false', () => {
      transition.filter({}).should.equal(false);
    });
    it('no type returns false', () => {
      transition.filter({ form: 'x' }).should.equal(false);
    });
    it('invalid submission returns false', () => {
      config.get.returns([{ form: 'x' }, { form: 'z' }]);
      sinon.stub(utils, 'isValidSubmission').returns(false);
      transition
        .filter({
          form: 'x',
          type: 'data_record',
          reported_date: 1,
        })
        .should.equal(false);
      utils.isValidSubmission.callCount.should.equal(1);
      utils.isValidSubmission.args[0].should.deep.equal([{ form: 'x', type: 'data_record', reported_date: 1 }]);
    });
    it('returns true', () => {
      config.get.returns([{ form: 'x' }, { form: 'z' }]);
      sinon.stub(utils, 'isValidSubmission').returns(true);
      transition
        .filter({
          form: 'x',
          type: 'data_record',
          reported_date: 1,
        })
        .should.equal(true);
      utils.isValidSubmission.callCount.should.equal(1);
      utils.isValidSubmission.args[0].should.deep.equal([{ form: 'x', type: 'data_record', reported_date: 1 }]);
    });
  });

  describe('onMatch', () => {
    it('return undefined if form not included', () => {
      config.get.returns([{ form: 'x' }, { form: 'z' }]);
      const change = {
        doc: {
          form: 'y',
        },
      };
      return transition.onMatch(change).then(changed => {
        (typeof changed).should.equal('undefined');
      });
    });

    it('with no patient id adds error msg and response', () => {
      config.get.returns([{ form: 'x' }, { form: 'z' }]);
      sinon.stub(utils, 'getReportsBySubject').resolves([]);

      const doc = {
        form: 'x',
        fields: { patient_id: 'x' },
      };

      return transition.onMatch({ doc }).then((changed) => {
        changed.should.equal(true);
        doc.errors.length.should.equal(1);
        doc.errors[0].message.should.equal(
          'messages.generic.registration_not_found'
        );
      });
    });

    it('should add message when failing validation', () => {
      const doc = {
        fields: { patient_id: 'x' },
        from: '+123',
        form: 'aaa',
        patient: { patient_id: 'x' }
      };
      sinon.stub(utils, 'getSubjectIds').returns(['x', 'y']);
      sinon.stub(utils, 'getReportsBySubject').resolves([]);
      sinon.stub(validation, 'validate').resolves(['some_error']);

      config.get.returns([{
        form: 'aaa',
        validations: { list: ['validation1', 'validation2'] },
        messages: [
          {
            event_type: 'registration_not_found',
            message: [
              {
                content: 'not found {{patient_id}}',
                locale: 'en',
              },
            ],
            recipient: 'reporting_unit',
          },
        ],
      }]);

      return transition.onMatch({ doc }).then((changed) => {
        changed.should.equal(true);
        doc.errors.should.deep.equal([{ message: 'some_error', code: 'invalid_report' }]);
        doc.tasks.length.should.equal(1);
        doc.tasks[0].messages[0].should.deep.include({ to: '+123', message: 'some_error'});
        validation.validate.callCount.should.equal(1);
        validation.validate.args[0].should.deep.equal([doc, ['validation1', 'validation2']]);
      });
    });

    it('should return true when doc is processed', () => {
      const doc = {
        fields: { patient_id: 'x' },
        from: '+123',
        form: 'aaa',
        patient: { patient_id: 'x' }
      };
      sinon.stub(utils, 'getSubjectIds').returns(['x', 'y']);
      sinon.stub(utils, 'getReportsBySubject').resolves([]);
      sinon.stub(validation, 'validate').resolves([]);

      config.get.returns([{
        form: 'aaa',
        messages: [
          {
            event_type: 'registration_not_found',
            message: [
              {
                content: 'not found {{patient_id}}',
                locale: 'en',
              },
            ],
            recipient: 'reporting_unit',
          },
        ],
      }]);

      return transition.onMatch({ doc }).then((changed) => {
        changed.should.equal(true);
        (typeof doc.errors).should.equal('undefined');
        (typeof doc.tasks).should.equal('undefined');
        utils.getReportsBySubject.callCount.should.equal(1);
        utils.getReportsBySubject.args[0].should.deep.equal([{ ids: ['x', 'y'], registrations: true }]);
        utils.getSubjectIds.callCount.should.equal(1);
        utils.getSubjectIds.args[0].should.deep.equal([doc.patient]);
        validation.validate.callCount.should.equal(1);
        validation.validate.args[0].slice(0, 2).should.deep.equal([doc, undefined]); // 3rd arg is a function
      });
    });
  });

  describe('handleReport', () => {
    // Because patients can be created through the UI and not necessarily have
    // a registration at all
    it('with no registrations does not error', () => {
      const doc = {
        fields: { patient_id: 'x' },
        from: '+123',
        patient: { patient_id: 'x' }
      };
      sinon.stub(utils, 'getSubjectIds').returns(['x', 'y']);
      sinon.stub(utils, 'getReportsBySubject').resolves([]);

      const config = {
        messages: [
          {
            event_type: 'registration_not_found',
            message: [
              {
                content: 'not found {{patient_id}}',
                locale: 'en',
              },
            ],
            recipient: 'reporting_unit',
          },
        ],
      };

      return transition._handleReport(doc, config).then(() => {
        (typeof doc.errors).should.equal('undefined');
        (typeof doc.tasks).should.equal('undefined');
        utils.getReportsBySubject.callCount.should.equal(1);
        utils.getReportsBySubject.args[0].should.deep.equal([{ ids: ['x', 'y'], registrations: true }]);
        utils.getSubjectIds.callCount.should.equal(1);
        utils.getSubjectIds.args[0].should.deep.equal([doc.patient]);
      });
    });

    it('with patient adds reply', () => {
      const patient = { patient_name: 'Archibald', patient_id: '559', _id: 'patient' };
      const doc = {
        fields: { patient_id: '559' },
        contact: {
          phone: '+1234',
          name: 'woot',
          parent: {
            contact: {
              phone: '+1234',
              name: 'woot',
            },
          },
        },
        patient: patient,
      };
      sinon.stub(utils, 'getReportsBySubject').resolves([{ _id: 'reg1', regField: 'alpha' }]);
      const config = {
        messages: [
          {
            event_type: 'report_accepted',
            message: [
              {
                content:
                  'Thank you, {{contact.name}}. ' +
                  'ANC visit for {{patient_name}} ({{patient_id}})(reg {{regField}}) has been recorded.',
                locale: 'en',
              },
            ],
            recipient: 'reporting_unit',
          },
        ],
      };
      return transition._handleReport(doc, config).then(() => {
        utils.getReportsBySubject.callCount.should.equal(1);
        utils.getReportsBySubject.args[0].should.deep.equal([{ ids: ['patient', '559'], registrations: true }]);

        doc.tasks[0].messages[0].message.should.equal(
          'Thank you, woot. ANC visit for Archibald (559)(reg alpha) has been recorded.'
        );
      });
    });

    it('with place adds reply ', () => {
      const place = { place_name: 'Seneca', place_id: '698', _id: 'the_place' };
      const doc = {
        fields: { place_id: '698' },
        contact: { phone: '+1234', name: 'woot' },
        place: place,
      };
      sinon.stub(utils, 'getReportsBySubject').resolves([{ _id: 'reg1', regField: 'beta' }]);
      const config = {
        messages: [
          {
            event_type: 'report_accepted',
            message: [
              {
                content:
                  'Thank you, ' +
                  '{{contact.name}}. The visit for {{place_name}} ({{place_id}})(reg {{regField}}) has been recorded.',
                locale: 'en',
              },
            ],
            recipient: 'reporting_unit',
          },
        ],
      };
      return transition._handleReport(doc, config).then(() => {
        utils.getReportsBySubject.callCount.should.equal(1);
        utils.getReportsBySubject.args[0].should.deep.equal([{ ids: ['the_place', '698'], registrations: true }]);

        doc.tasks[0].messages[0].message.should.equal(
          'Thank you, woot. The visit for Seneca (698)(reg beta) has been recorded.'
        );
      });
    });

    it('with place and patient adds reply ', () => {
      const place = { place_name: 'Seneca', place_id: '698', _id: 'the_place' };
      const patient = { patient_name: 'Archibald', patient_id: '559', _id: 'patient' };
      const doc = {
        fields: { place_id: '698' },
        contact: { phone: '+1234', name: 'woot' },
        place: place,
        patient: patient,
      };
      sinon.stub(utils, 'getReportsBySubject')
        .onCall(0).resolves([{ _id: 'reg1', regField: 'alpha' }])
        .onCall(1).resolves([{ _id: 'reg2', pRegField: 'beta' }]);

      const config = {
        messages: [
          {
            event_type: 'report_accepted',
            message: [
              {
                content: '{{patient_name}} ({{patient_id}} {{regField}}) {{place_name}} ({{place_id}} {{pRegField}})',
                locale: 'en',
              },
            ],
            recipient: 'reporting_unit',
          },
        ],
      };
      return transition._handleReport(doc, config).then(() => {
        utils.getReportsBySubject.callCount.should.equal(2);
        utils.getReportsBySubject.args[0].should.deep.equal([{ ids: ['patient', '559'], registrations: true }]);
        utils.getReportsBySubject.args[1].should.deep.equal([{ ids: ['the_place', '698'], registrations: true }]);

        doc.tasks[0].messages[0].message.should.equal(
          'Archibald (559 alpha) Seneca (698 beta)'
        );
      });
    });

    it('adding silence_type to handleReport calls _silenceReminders', () => {
      sinon.stub(transition, '_silenceReminders').resolves();
      const doc = { _id: 'a', fields: { patient_id: 'x' }, patient: { patient_id: 'x' } };
      const config = { silence_type: 'x', messages: [] };
      const registrations = [
        { _id: 'a' }, // should not be silenced as it's the doc being processed
        { _id: 'b' }, // should be silenced
        { _id: 'c' }, // should be silenced
      ];
      sinon.stub(utils, 'getReportsBySubject').resolves(registrations);
      return transition._handleReport(doc, config).then(() => {
        utils.getReportsBySubject.callCount.should.equal(1);
        utils.getReportsBySubject.args[0].should.deep.equal([{ ids: ['x'], registrations: true }]);

        transition._silenceReminders.callCount.should.equal(2);
        transition._silenceReminders.args[0][0]._id.should.equal('b');
        transition._silenceReminders.args[0][1]._id.should.equal('a');
        transition._silenceReminders.args[1][0]._id.should.equal('c');
        transition._silenceReminders.args[1][1]._id.should.equal('a');
      });
    });

    it('should silence place registrations', () => {
      sinon.stub(transition, '_silenceReminders').resolves();
      const doc = { _id: '1', fields: { place_id: '789' }, place: { place_id: '789' } };
      const config = { silence_type: 'x', messages: [] };
      const registrations = [
        { _id: '1' }, // should not be silenced as it's the doc being processed
        { _id: '2' }, // should be silenced
        { _id: '3' }, // should be silenced
      ];
      sinon.stub(utils, 'getReportsBySubject').resolves(registrations);
      return transition._handleReport(doc, config).then(() => {
        utils.getReportsBySubject.callCount.should.equal(1);
        utils.getReportsBySubject.args[0].should.deep.equal([{ ids: ['789'], registrations: true }]);

        transition._silenceReminders.callCount.should.equal(2);
        transition._silenceReminders.args[0][0]._id.should.equal('2');
        transition._silenceReminders.args[0][1]._id.should.equal('1');
        transition._silenceReminders.args[1][0]._id.should.equal('3');
        transition._silenceReminders.args[1][1]._id.should.equal('1');
      });
    });

    it('should silence place and patient registrations', () => {
      sinon.stub(transition, '_silenceReminders').resolves();
      const doc = {
        _id: 'report',
        fields: { patient_id: '123', place_id: '456' },
        place: { _id: 'place_uuid', place_id: '456' },
        patient: { _id: 'patient_uuid', patient_id: '123' },
      };
      const config = { silence_type: 'x', messages: [] };
      const patientRegistrations = [{ _id: 'report' }, { _id: 'old1' }];
      const placeRegistrations = [{ _id: 'old2' }, { _id: 'old3' }];
      sinon
        .stub(utils, 'getReportsBySubject')
        .onCall(0).resolves(patientRegistrations)
        .onCall(1).resolves(placeRegistrations);

      return transition._handleReport(doc, config).then(() => {
        utils.getReportsBySubject.callCount.should.equal(2);
        utils.getReportsBySubject.args[0].should.deep.equal([{ ids: ['patient_uuid', '123'], registrations: true }]);
        utils.getReportsBySubject.args[1].should.deep.equal([{ ids: ['place_uuid', '456'], registrations: true }]);

        transition._silenceReminders.callCount.should.equal(3);
        transition._silenceReminders.args[0][0]._id.should.equal('old1');
        transition._silenceReminders.args[0][1]._id.should.equal('report');
        transition._silenceReminders.args[1][0]._id.should.equal('old2');
        transition._silenceReminders.args[1][1]._id.should.equal('report');
        transition._silenceReminders.args[2][0]._id.should.equal('old3');
        transition._silenceReminders.args[2][1]._id.should.equal('report');
      });
    });

    it('adds registration_id property for patient_id', () => {
      sinon.stub(transition, '_silenceReminders').resolves();
      const doc = { _id: 'z', fields: { patient_id: 'x' }, patient: { patient_id: 'x' } };
      const config = { silence_type: 'x', messages: [] };
      const registrations = [
        { _id: 'a', reported_date: '2017-02-05T09:23:07.853Z' },
      ];
      sinon.stub(utils, 'getReportsBySubject').resolves(registrations);
      return transition._handleReport(doc, config).then(() => {
        doc.registration_id.should.equal(registrations[0]._id);
      });
    });

    it('adds registration_id property for place_id', () => {
      sinon.stub(transition, '_silenceReminders').resolves();
      const doc = { _id: 'z', fields: { place_id: 'x' }, place: { place_id: 'x' } };
      const config = { silence_type: 'x', messages: [] };
      const registrations = [
        { _id: 'a', reported_date: '2017-02-05T09:23:07.853Z' },
      ];
      sinon.stub(utils, 'getReportsBySubject').resolves(registrations);
      return transition._handleReport(doc, config).then(() => {
        doc.registration_id.should.equal(registrations[0]._id);
      });
    });

    it('adds registration_id property for patient_id and place_id', () => {
      sinon.stub(transition, '_silenceReminders').resolves();
      const doc = {
        _id: 'z',
        fields: { patient_id: 'y', place_id: 'x' },
        place: { place_id: 'x' },
        patient: { patient_id: 'y' },
      };
      const config = { silence_type: 'x', messages: [] };
      const patientRegistrations = [{ _id: 'a', reported_date: 300 }, { _id: 'b', reported_date: 200 }];
      const placeRegistrations = [{ _id: 'c', reported_date: 50 }, { _id: 'd', reported_date: 10 }];
      sinon
        .stub(utils, 'getReportsBySubject')
        .onCall(0).resolves(patientRegistrations)
        .onCall(1).resolves(placeRegistrations);

      return transition._handleReport(doc, config).then(() => {
        doc.registration_id.should.equal(patientRegistrations[0]._id);
      });
    });

    it('if there are multiple registrations uses the latest one', () => {
      sinon.stub(transition, '_silenceReminders').resolves();
      const doc = {
        _id: 'z',
        fields: { patient_id: 'x', place_id: 'y' },
        patient: { patient_id: 'x' },
        place: { place_id: 'y' },
      };
      const config = { silence_type: 'x', messages: [] };
      const patientRegistrations = [
        { _id: 'a', reported_date: '2017-02-05T09:23:07.853Z' },
        { _id: 'c', reported_date: '2018-02-05T09:23:07.853Z' },
        { _id: 'b', reported_date: '2016-02-05T09:23:07.853Z' },
      ];
      const placeRegistrations = [
        { _id: 'c', reported_date: '2017-01-01T09:23:07.853Z' },
        { _id: 'd', reported_date: '2015-01-01T09:23:07.853Z' },
      ];
      sinon
        .stub(utils, 'getReportsBySubject')
        .onCall(0).resolves(patientRegistrations)
        .onCall(1).resolves(placeRegistrations);
      return transition._handleReport(doc, config).then(() => {
        doc.registration_id.should.equal(patientRegistrations[1]._id);
      });
    });

    it('if there are multiple registrations uses the latest one when latest is a place registration', () => {
      sinon.stub(transition, '_silenceReminders').resolves();
      const doc = {
        _id: 'z',
        fields: { patient_id: 'x', place_id: 'y' },
        patient: { patient_id: 'x' },
        place: { place_id: 'y' },
      };
      const config = { silence_type: 'x', messages: [] };
      const patientRegistrations = [
        { _id: 'a', reported_date: '2017-02-05T09:23:07.853Z' },
        { _id: 'c', reported_date: '2018-02-05T09:23:07.853Z' },
        { _id: 'b', reported_date: '2016-02-05T09:23:07.853Z' },
      ];
      const placeRegistrations = [
        { _id: 'c', reported_date: '2017-01-01T09:23:07.853Z' },
        { _id: 'd', reported_date: '2019-01-01T09:23:07.853Z' },
      ];
      sinon
        .stub(utils, 'getReportsBySubject')
        .onCall(0).resolves(patientRegistrations)
        .onCall(1).resolves(placeRegistrations);
      return transition._handleReport(doc, config).then(() => {
        doc.registration_id.should.equal(placeRegistrations[1]._id);
      });
    });

    it('handles an empty list of scheduled_tasks', () => {
      const doc = {
        _id: 'z',
        fields: { patient_id: 'x' },
        reported_date: '2018-09-17T18:45:00.000Z',
      };
      const config = { silence_type: 'x', silence_for: '8 days', messages: [] };
      const registrations = [
        {
          _id: 'a',
          reported_date: '2017-02-05T09:23:07.853Z',
          scheduled_tasks: [],
        },
      ];
      const putRegistration = sinon.stub(db.medic, 'put');
      sinon.stub(utils, 'getReportsBySubject').resolves(registrations);
      return transition._handleReport(doc, config).then(() => {
        putRegistration.callCount.should.equal(0);
      });
    });

    // Helpful diagram for the next 5 tests:
    // https://github.com/medic/medic/issues/4694#issuecomment-459460521
    it('does not associate visit to anything since no reminder messages have been sent yet', () => {
      sinon.stub(db.medic, 'post').resolves({ ok : true, id: 'a', rev: 'k' });
      const doc = {
        _id: 'z',
        fields: { patient_id: 'x' },
        reported_date: '2018-09-17T18:45:00.000Z',
      };
      const config = { silence_type: 'x', silence_for: '8 days', messages: [] };
      const registrations = [
        {
          _id: 'a',
          reported_date: '2017-02-05T09:23:07.853Z',
          scheduled_tasks: [
            {
              due: '2018-09-28T19:45:00.000Z',
              state: 'scheduled',
              messages: [
                {
                  uuid: 'k5',
                },
              ],
              type: 'x',
              group: 1
            },
            {
              due: '2018-10-28T20:45:00.000Z',
              state: 'scheduled',
              messages: [
                {
                  uuid: 'k',
                },
              ],
              type: 'x',
              group: 1
            },
            {
              due: '2018-11-28T21:45:00.000Z',
              state: 'scheduled',
              messages: [
                {
                  uuid: 'j',
                },
              ],
              type: 'x',
              group: 1
            },
          ],
        },
      ];
      sinon.stub(utils, 'getReportsBySubject').resolves(registrations);
      return transition._handleReport(doc, config).then(() => {
        should.not.exist(registrations[0].scheduled_tasks[0].responded_to_by);
        should.not.exist(registrations[0].scheduled_tasks[1].responded_to_by);
        should.not.exist(registrations[0].scheduled_tasks[2].responded_to_by);
      });
    });

    it('does not associate visit to anything since it is not responding to a reminder', () => {
      sinon.stub(db.medic, 'post').resolves({ ok : true, id: 'a', rev: 'k' });
      const doc = {
        _id: 'z',
        fields: { patient_id: 'x' },
        reported_date: '2018-09-28T18:45:00.000Z',
      };
      const config = { silence_type: 'x', silence_for: '8 days', messages: [] };
      const registrations = [
        {
          _id: 'a',
          reported_date: '2017-02-05T09:23:07.853Z',
          scheduled_tasks: [
            {
              due: '2018-09-28T19:45:00.000Z',
              state: 'scheduled',
              messages: [
                {
                  uuid: 'k5',
                },
              ],
              type: 'x',
              group: 1
            },
            {
              due: '2018-10-28T20:45:00.000Z',
              state: 'scheduled',
              messages: [
                {
                  uuid: 'k',
                },
              ],
              type: 'x',
              group: 1
            },
            {
              due: '2018-11-28T21:45:00.000Z',
              state: 'scheduled',
              messages: [
                {
                  uuid: 'j',
                },
              ],
              type: 'x',
              group: 1
            },
          ],
        },
      ];
      sinon.stub(utils, 'getReportsBySubject').resolves(registrations);
      return transition._handleReport(doc, config).then(() => {
        should.not.exist(registrations[0].scheduled_tasks[0].responded_to_by);
        should.not.exist(registrations[0].scheduled_tasks[1].responded_to_by);
        should.not.exist(registrations[0].scheduled_tasks[2].responded_to_by);
      });
    });

    it('associates visit to Group 1 Message 1', () => {
      const putRegistration = sinon.stub(db.medic, 'put');
      putRegistration.resolves({ ok : true, id: 'a', rev: 'r' });
      sinon.stub(db.medic, 'post').resolves({ ok : true, id: 'a', rev: 'k' });
      const doc = {
        _id: 'z',
        fields: { patient_id: 'x' },
        patient: { patient_id: 'x' },
        reported_date: '2018-09-28T19:45:00.000Z',
      };
      const config = { silence_type: 'x', silence_for: '8 days', messages: [] };
      const registrations = [
        {
          _id: 'a',
          reported_date: '2017-02-05T09:23:07.853Z',
          scheduled_tasks: [
            {
              due: '2018-09-18T18:45:00.000Z',
              state: 'sent',
              messages: [
                {
                  uuid: 'k5',
                },
              ],
              type: 'x',
              group: 1
            },
            {
              due: '2018-10-28T20:45:00.000Z',
              state: 'scheduled',
              messages: [
                {
                  uuid: 'k',
                },
              ],
              type: 'x',
              group: 1
            },
            {
              due: '2018-11-28T21:45:00.000Z',
              state: 'scheduled',
              messages: [
                {
                  uuid: 'j',
                },
              ],
              type: 'x',
              group: 1
            },
          ],
        },
      ];
      sinon.stub(utils, 'getReportsBySubject').resolves(registrations);
      return transition._handleReport(doc, config).then(() => {
        putRegistration.callCount.should.equal(1);
        registrations[0].scheduled_tasks[0].responded_to_by.should.deep.equal([doc._id]);
        should.not.exist(registrations[0].scheduled_tasks[1].responded_to_by);
        should.not.exist(registrations[0].scheduled_tasks[2].responded_to_by);
      });
    });

    it('stores visit UUIDs in an array, since there can be multiple', () => {
      const putRegistration = sinon.stub(db.medic, 'put');
      putRegistration.resolves({ ok : true, id: 'a', rev: 'r' });
      sinon.stub(db.medic, 'post').resolves({ ok : true, id: 'a', rev: 'k' });
      const doc1 = {
        _id: 'z',
        fields: { patient_id: 'x' },
        patient: { patient_id: 'x' },
        reported_date: '2018-09-28T20:45:00.000Z',
      };
      const doc2 = {
        _id: 'z',
        fields: { patient_id: 'x' },
        patient: { patient_id: 'x' },
        reported_date: '2018-09-28T21:45:00.000Z',
      };
      const config = { silence_type: 'x', silence_for: '8 days', messages: [] };
      const registrations = [
        {
          _id: 'a',
          reported_date: '2017-02-05T09:23:07.853Z',
          scheduled_tasks: [
            {
              due: '2018-09-28T18:45:00.000Z',
              state: 'sent',
              messages: [
                {
                  uuid: 'k5',
                },
              ],
              type: 'x',
              group: 1
            },
            {
              due: '2018-09-28T19:45:00.000Z',
              state: 'sent',
              messages: [
                {
                  uuid: 'k',
                },
              ],
              type: 'x',
              group: 1
            },
            {
              due: '2018-11-28T21:45:00.000Z',
              state: 'scheduled',
              messages: [
                {
                  uuid: 'j',
                },
              ],
              type: 'x',
              group: 1
            },
          ],
        },
      ];
      sinon.stub(db.medic, 'get').resolves(registrations);
      sinon.stub(utils, 'getReportsBySubject').resolves(registrations);
      return transition._handleReport(doc1, config).then((complete) => {
        complete.should.deep.equal({ ok : true, id: 'a', rev: 'r' });
        putRegistration.callCount.should.equal(1);
        should.not.exist(registrations[0].scheduled_tasks[0].responded_to_by);
        registrations[0].scheduled_tasks[1].responded_to_by.should.deep.equal([doc1._id]);
        should.not.exist(registrations[0].scheduled_tasks[2].responded_to_by);

        return transition._handleReport(doc2, config).then((complete) => {
          complete.should.deep.equal({ ok : true, id: 'a', rev: 'r' });
          putRegistration.callCount.should.equal(2);
          should.not.exist(registrations[0].scheduled_tasks[0].responded_to_by);
          registrations[0].scheduled_tasks[1].responded_to_by.should.deep.equal([doc1._id, doc2._id]);
          should.not.exist(registrations[0].scheduled_tasks[2].responded_to_by);
        });
      });
    });

    it('associates visit to Group 1 Message 2.', () => {
      const putRegistration = sinon.stub(db.medic, 'put');
      putRegistration.resolves({ ok : true, id: 'a', rev: 'r' });
      sinon.stub(db.medic, 'post').resolves({ ok : true, id: 'a', rev: 'k' });
      const doc = {
        _id: 'z',
        fields: { patient_id: 'x' },
        patient: { patient_id: 'x' },
        reported_date: '2018-09-28T20:45:00.000Z',
      };
      const config = { silence_type: 'x', silence_for: '8 days', messages: [] };
      const registrations = [
        {
          _id: 'a',
          reported_date: '2017-02-05T09:23:07.853Z',
          scheduled_tasks: [
            {
              due: '2018-09-28T18:45:00.000Z',
              state: 'sent',
              messages: [
                {
                  uuid: 'k5',
                },
              ],
              type: 'x',
              group: 1
            },
            {
              due: '2018-09-28T19:45:00.000Z',
              state: 'sent',
              messages: [
                {
                  uuid: 'k',
                },
              ],
              type: 'x',
              group: 1
            },
            {
              due: '2018-11-28T21:45:00.000Z',
              state: 'scheduled',
              messages: [
                {
                  uuid: 'j',
                },
              ],
              type: 'x',
              group: 1
            },
          ],
        },
      ];
      sinon.stub(utils, 'getReportsBySubject').resolves(registrations);
      return transition._handleReport(doc, config).then((complete) => {
        complete.should.deep.equal({ ok : true, id: 'a', rev: 'r' });
        putRegistration.callCount.should.equal(1);
        should.not.exist(registrations[0].scheduled_tasks[0].responded_to_by);
        registrations[0].scheduled_tasks[1].responded_to_by.should.deep.equal([doc._id]);
        should.not.exist(registrations[0].scheduled_tasks[2].responded_to_by);
      });
    });

    it('associates visit to Group 1 Message 3', () => {
      const putRegistration = sinon.stub(db.medic, 'put');
      putRegistration.resolves({ ok : true, id: 'a', rev: 'r' });
      sinon.stub(db.medic, 'post').resolves({ ok : true, id: 'a', rev: 'k' });
      const doc = {
        _id: 'z',
        fields: { patient_id: 'x' },
        patient: { patient_id: 'x' },
        reported_date: '2018-12-15T18:45:00.000Z',
      };
      const config = { silence_type: 'x', silence_for: '8 days', messages: [] };
      const registrations = [
        {
          _id: 'a',
          reported_date: '2017-02-05T09:23:07.853Z',
          scheduled_tasks: [
            {
              due: '2018-09-26T18:45:00.000Z',
              state: 'sent',
              messages: [
                {
                  uuid: 'k1',
                },
              ],
              type: 'x',
              group: 1
            },
            {
              due: '2018-10-26T18:45:00.000Z',
              state: 'sent',
              messages: [
                {
                  uuid: 'k2',
                },
              ],
              type: 'x',
              group: 1
            },
            {
              due: '2018-11-26T18:45:00.000Z',
              state: 'sent',
              messages: [
                {
                  uuid: 'k3',
                },
              ],
              type: 'x',
              group: 1
            },
            {
              due: '2019-01-26T18:45:00.000Z',
              state: 'scheduled',
              messages: [
                {
                  uuid: 'k4',
                },
              ],
              type: 'x',
              group: 2
            },
          ],
        },
      ];
      sinon.stub(utils, 'getReportsBySubject').resolves(registrations);
      return transition._handleReport(doc, config).then((complete) => {
        complete.should.deep.equal({ ok : true, id: 'a', rev: 'r' });
        putRegistration.callCount.should.equal(1);
        should.not.exist(registrations[0].scheduled_tasks[0].responded_to_by);
        should.not.exist(registrations[0].scheduled_tasks[1].responded_to_by);
        registrations[0].scheduled_tasks[2].responded_to_by.should.deep.equal([doc._id]);
        should.not.exist(registrations[0].scheduled_tasks[3].responded_to_by);
      });
    });

    it('does not associate visit to anything since it is within the silence_for range', () => {
      sinon.stub(db.medic, 'post').resolves({ ok : true, id: 'a', rev: 'k' });
      const doc = {
        _id: 'z',
        fields: { patient_id: 'x' },
        patient: { patient_id: 'x' },
        reported_date: '2019-01-20T18:45:00.000Z',
      };
      const config = { silence_type: 'x', silence_for: '8 days', messages: [] };
      const registrations = [
        {
          _id: 'a',
          reported_date: '2017-02-05T09:23:07.853Z',
          scheduled_tasks: [
            {
              due: '2018-09-26T18:45:00.000Z',
              state: 'sent',
              messages: [
                {
                  uuid: 'k1',
                },
              ],
              type: 'x',
              group: 1
            },
            {
              due: '2018-10-26T18:45:00.000Z',
              state: 'sent',
              messages: [
                {
                  uuid: 'k2',
                },
              ],
              type: 'x',
              group: 1
            },
            {
              due: '2018-11-26T18:45:00.000Z',
              state: 'sent',
              messages: [
                {
                  uuid: 'k3',
                },
              ],
              type: 'x',
              group: 1
            },
            {
              due: '2019-01-26T18:45:00.000Z',
              state: 'scheduled',
              messages: [
                {
                  uuid: 'k4',
                },
              ],
              type: 'x',
              group: 2
            },
          ],
        },
      ];
      sinon.stub(db.medic, 'get').resolves(registrations);
      sinon.stub(utils, 'getReportsBySubject').resolves(registrations);
      return transition._handleReport(doc, config).then(() => {
        should.not.exist(registrations[0].scheduled_tasks[0].responded_to_by);
        should.not.exist(registrations[0].scheduled_tasks[1].responded_to_by);
        should.not.exist(registrations[0].scheduled_tasks[2].responded_to_by);
        should.not.exist(registrations[0].scheduled_tasks[3].responded_to_by);
      });
    });

    it('should catch utils.getReportsBySubject errors', () => {
      const doc = {
        _id: 'z',
        fields: { patient_id: 'x' },
        patient: { patient_id: 'x' },
        reported_date: '2019-01-20T18:45:00.000Z',
      };
      sinon.stub(utils, 'getReportsBySubject').rejects({ some: 'error' });
      sinon.stub(utils, 'getSubjectIds').returns(['a', 'b']);

      return transition
        ._handleReport(doc, {})
        .then(() => assert.fail('should have thrown'))
        .catch(err => {
          err.should.deep.equal({ some: 'error' });
          utils.getReportsBySubject.callCount.should.equal(1);
        });
    });

    it('should pass all registrations (patient and place) when adding report uuid to registration', () => {
      sinon.stub(db.medic, 'put').resolves({ ok : true, id: 'a', rev: 'r' });
      sinon.stub(db.medic, 'post').resolves({ ok : true, id: 'a', rev: 'k' });
      const doc = {
        _id: 'z',
        fields: { patient_id: 'x', place_id: 'y' },
        patient: { patient_id: 'x' },
        place: { place_id: 'y' },
        reported_date: '2018-09-28T19:45:00.000Z',
      };
      const config = { silence_type: 'x', silence_for: '2 days', messages: [] };
      const patientRegistrations = [
        {
          _id: 'a',
          reported_date: '2017-02-05T09:23:07.853Z',
          scheduled_tasks: [
            {
              due: '2018-09-18T18:45:00.000Z',
              state: 'cleared',
              messages: [
                {
                  uuid: 'k5',
                },
              ],
              type: 'x',
              group: 1
            },
            {
              due: '2018-10-28T20:45:00.000Z',
              state: 'scheduled',
              messages: [
                {
                  uuid: 'k',
                },
              ],
              type: 'x',
              group: 1
            },
            {
              due: '2018-11-28T21:45:00.000Z',
              state: 'scheduled',
              messages: [
                {
                  uuid: 'j',
                },
              ],
              type: 'x',
              group: 1
            },
          ],
        },
      ];
      const placeRegistrations = [{
        _id: 'b',
        reported_date: '2017-02-04T09:23:07.853Z',
        scheduled_tasks: [
          {
            due: '2018-09-17T18:45:00.000Z',
            state: 'sent',
            messages: [
              {
                uuid: 'p98',
              },
            ],
            type: 'x',
            group: 1
          },
          {
            due: '2018-10-28T20:45:00.000Z',
            state: 'scheduled',
            messages: [
              {
                uuid: 'k44',
              },
            ],
            type: 'x',
            group: 1
          },
          {
            due: '2018-11-28T21:45:00.000Z',
            state: 'scheduled',
            messages: [
              {
                uuid: 'j99',
              },
            ],
            type: 'x',
            group: 1
          },
        ],
      }];
      sinon
        .stub(utils, 'getReportsBySubject')
        .onCall(0).resolves(patientRegistrations)
        .onCall(1).resolves(placeRegistrations);

      return transition._handleReport(doc, config).then((complete) => {
        complete.should.deep.equal({ ok : true, id: 'a', rev: 'r' });
        db.medic.put.callCount.should.equal(1);
        placeRegistrations[0].scheduled_tasks[0].responded_to_by.should.deep.equal([doc._id]);
        should.not.exist(patientRegistrations[0].scheduled_tasks[0].responded_to_by);
        should.not.exist(patientRegistrations[0].scheduled_tasks[1].responded_to_by);
        should.not.exist(patientRegistrations[0].scheduled_tasks[2].responded_to_by);
        should.not.exist(placeRegistrations[0].scheduled_tasks[1].responded_to_by);
        should.not.exist(placeRegistrations[0].scheduled_tasks[2].responded_to_by);
      });
    });
  });

  describe('silenceReminders', () => {
    it('Sets tasks to cleared and saves them', () => {
      const reportId = 'reportid';
      const report = {
        _id: reportId,
        reported_date: 123,
      };
      const registration = {
        _id: 'test-registration',
        scheduled_tasks: [
          { state: 'scheduled' },
          { state: 'scheduled' },
          { state: 'pending' },
          { state: 'muted' }
        ],
      };

      sinon
        .stub(transition, '_findToClear')
        .returns(registration.scheduled_tasks);
      const setTaskState = sinon.stub(utils, 'setTaskState');
      sinon.stub(db.medic, 'post').resolves({ _id: 'test-registration', rev: 'k' });

      return transition._silenceReminders(registration, report, null).then(() => {
        registration._id.should.equal('test-registration');
        registration.scheduled_tasks.length.should.equal(4);
        setTaskState.callCount.should.equal(4);
        setTaskState
          .getCall(0)
          .args.should.deep.equal([
            { state: 'scheduled', cleared_by: reportId },
            'cleared',
          ]);
        setTaskState
          .getCall(1)
          .args.should.deep.equal([
            { state: 'scheduled', cleared_by: reportId },
            'cleared',
          ]);
        setTaskState
          .getCall(2)
          .args.should.deep.equal([
            { state: 'pending', cleared_by: reportId },
            'cleared',
          ]);

        setTaskState.getCall(3).args.should.deep.equal([{ state: 'muted', cleared_by: reportId }, 'cleared']);
        registration.scheduled_tasks[0].cleared_by.should.equal(reportId);
        registration.scheduled_tasks[1].cleared_by.should.equal(reportId);
        registration.scheduled_tasks[2].cleared_by.should.equal(reportId);
        registration.scheduled_tasks[3].cleared_by.should.equal(reportId);
      });
    });
  });

  describe('findToClear', () => {
    const ids = ts => ts.map(t => t._id);

    it('returns no tasks on registrations with none', () => {
      const registration = {
        scheduled_tasks: [],
      };

      transition
        ._findToClear(registration, new Date(), { silence_type: 'test' })
        .should.deep.equal([]);
      transition
        ._findToClear(registration, new Date(), {
          silence_type: 'test',
          silence_for: '1000 years',
        })
        .should.deep.equal([]);
    });

    describe('without silence_for range', () => {
      const now = moment();
      const registration = {
        scheduled_tasks: [
          {
            _id: 1,
            due: now.clone().subtract(1, 'days'),
            state: 'pending',
            group: 1,
            type: 'x',
          },
          {
            _id: 2,
            due: now.clone().add(1, 'days'),
            state: 'scheduled',
            group: 1,
            type: 'x',
          },
          {
            _id: 3,
            due: now.clone().add(1, 'days'),
            state: 'scheduled',
            group: 2,
            type: 'x',
          },
          {
            _id: 4,
            due: now.clone().add(1, 'days'),
            state: 'scheduled',
            group: 2,
            type: 'y',
          },
          {
            _id: 5,
            due: now.clone().add(1, 'days'),
            state: 'not-scheduled',
            group: 2,
            type: 'y',
          },
          {
            _id: 6,
            due: now.clone().add(1, 'days'),
            state: 'scheduled',
            group: 3,
            type: 'y',
          },
        ],
      };

      it('returns all scheduled or pending scheduled_tasks of the given type', () => {
        const results = transition._findToClear(registration, now.valueOf(), {
          silence_type: 'x',
        });
        ids(results).should.deep.equal([1, 2, 3]);
      });
      it('or multiple types', () => {
        const results = transition._findToClear(registration, now.valueOf(), {
          silence_type: 'x,y',
        });
        ids(results).should.deep.equal([1, 2, 3, 4, 6]);
      });
    });
    describe('with silence_for range', () => {
      const now = moment();
      const silence_for = '5 days';
      const registration = {
        scheduled_tasks: [
          // A group with a sent task before, and after, but not within range
          {
            _id: 1,
            due: now.clone().subtract(1, 'days'),
            state: 'sent',
            group: 1,
            type: 'x',
          },
          {
            _id: 2,
            due: now.clone().add(9, 'days'),
            state: 'scheduled',
            group: 1,
            type: 'x',
          },
          // A group with a task in range and subsequent tasks out of range
          {
            _id: 3,
            due: now.clone().add(1, 'days'),
            state: 'pending',
            group: 2,
            type: 'x',
          },
          {
            _id: 4,
            due: now.clone().add(9, 'days'),
            state: 'scheduled',
            group: 2,
            type: 'x',
          },
          // A group that overlaps with the above group and is also a valid group
          {
            _id: 31,
            due: now.clone().add(2, 'days'),
            state: 'scheduled',
            group: 21,
            type: 'x',
          },
          {
            _id: 41,
            due: now.clone().add(10, 'days'),
            state: 'scheduled',
            group: 21,
            type: 'x',
          },
          // A group with no tasks in range
          {
            _id: 5,
            due: now.clone().add(9, 'days'),
            state: 'scheduled',
            group: 3,
            type: 'x',
          },
          // A group in range but of a different type
          {
            _id: 6,
            due: now.clone().add(1, 'days'),
            state: 'scheduled',
            group: 2,
            type: 'y',
          },
          {
            _id: 7,
            due: now.clone().add(9, 'days'),
            state: 'scheduled',
            group: 2,
            type: 'y',
          },
        ],
      };
      it('returns all scheduled or pending scheduled_tasks that are in groups with tasks in the given range', () => {
        const results = transition._findToClear(registration, now.valueOf(), {
          silence_type: 'x',
          silence_for: silence_for,
        });
        ids(results).should.deep.equal([2, 3, 4, 31, 41]);
      });
      it('also with multiple types', () => {
        const results = transition._findToClear(registration, now.valueOf(), {
          silence_type: 'x,y',
          silence_for: silence_for,
        });
        ids(results).should.deep.equal([2, 3, 4, 31, 41, 6, 7]);
      });
    });
  });

  describe('addMessageToDoc', () => {
    it('Does not add a message if the bool_expr fails', () => {
      const doc = {};
      const config = {
        messages: [
          {
            event_type: 'report_accepted',
            bool_expr: 'false',
          },
        ],
      };
      const stub = sinon.stub(messages, 'addMessage');
      transition._addMessageToDoc(doc, config, []);
      stub.callCount.should.equal(0);
    });
    it('Adds a message if the bool_expr passes', () => {
      const doc = {};
      const config = {
        messages: [
          {
            event_type: 'report_accepted',
            bool_expr: 'true',
          },
        ],
      };
      const stub = sinon.stub(messages, 'addMessage');
      transition._addMessageToDoc(doc, config, []);
      stub.callCount.should.equal(1);
    });
  });
});
