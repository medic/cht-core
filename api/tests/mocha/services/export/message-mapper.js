const sinon = require('sinon');
const chai = require('chai');
const service = require('../../../../src/services/export/message-mapper');
const messageUtils = require('@medic/message-utils');
const registrationUtils = require('@medic/registration-utils');
const db = require('../../../../src/db');
const config = require('../../../../src/config');

describe('Message mapper', () => {

  beforeEach(() => {
    sinon.stub(db.medic, 'query');
    sinon.stub(messageUtils, 'generate');
    sinon.stub(registrationUtils, 'isValidRegistration');
    sinon.stub(config, 'get');
    sinon.stub(config, 'translate');
  });

  afterEach(() => sinon.restore());

  describe('getDocIds', () => {
    it('queries task-messages and returns message ids', () => {
      const options = { some: 'option' };

      db.medic.query.resolves({
        rows: [{ id: 1, value: 1 }, { id: 1, value: 2 }, { id: 1, value: 3 }, { id: 2, value: 1 }]
      });
      return service.getDocIds(options).then(result => {
        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(db.medic.query.args[0]).to.deep.equal([ 'medic/messages_by_state', options ]);
        chai.expect(result).to.deep.equal([1, 1, 1, 2]);
      });
    });
  });

  describe('map', () => {
    it('should return correct headers', () => {
      return service.map().then(result => {
        chai.expect(result.header).to.deep.equal([
          'id',
          'patient_id',
          'reported_date',
          'from',
          'type',
          'state',
          'received',
          'scheduled',
          'pending',
          'sent',
          'cleared',
          'muted',
          'message_id',
          'sent_by',
          'to_phone',
          'content'
        ]);
      });
    });

    describe('hydrate', () => {
      it('echoes when no records with scheduled tasks missing messages are found', () => {
        const records = [
          { _id: 1, tasks: [1, 2, 3] },
          { _id: 2, tasks: [1, 2, 3], scheduled_tasks: [] },
          { _id: 3, tasks: [1, 2, 3], scheduled_tasks: [{ messages: [{ some: 'message' }] }] }
        ];

        return service.map().then(({ hydrate }) => {
          const result = hydrate(records);
          chai.expect(result).to.deep.equal(records);
          chai.expect(db.medic.query.callCount).to.equal(0);
        });
      });

      it('echoes when records with scheduled tasks missing messages dont have patient ids', () => {
        const records = [
          { _id: 1, scheduled_tasks: [{ foo: 'bar' }] },
          { _id: 2, scheduled_tasks: [{ foo: 'bar' }], patient: {} },
          { _id: 3, scheduled_tasks: [{ foo: 'bar' }], patient: { patient_id: false } },
        ];

        return service.map().then(({ hydrate }) => {
          const result = hydrate(records);
          chai.expect(result).to.deep.equal(records);
          chai.expect(db.medic.query.callCount).to.equal(0);
        });
      });

      it('queries for registrations with all patient ids', () => {
        const records = [
          { _id: 1, scheduled_tasks: [{ foo: 'bar' }], patient: { patient_id: 'a' } },
          { _id: 2, scheduled_tasks: [{ foo: 'bar' }], patient: { patient_id: false} },
          { _id: 3, scheduled_tasks: [{ foo: 'bar' }], patient: { patient_id: 'b' } },
          { _id: 4, scheduled_tasks: [{ foo: 'bar' }], patient: { patient_id: 'a' } },
        ];

        db.medic.query.withArgs('medic-client/registered_patients').resolves({ rows: [] });

        return service.map().then(({ hydrate }) => {
          return hydrate(records).then(result => {
            chai.expect(result).to.deep.equal([
              { _id: 1, scheduled_tasks: [{ foo: 'bar' }], patient: { patient_id: 'a' }, registrations: [] },
              { _id: 2, scheduled_tasks: [{ foo: 'bar' }], patient: { patient_id: false}, registrations: [] },
              { _id: 3, scheduled_tasks: [{ foo: 'bar' }], patient: { patient_id: 'b' }, registrations: [] },
              { _id: 4, scheduled_tasks: [{ foo: 'bar' }], patient: { patient_id: 'a' }, registrations: [] },
            ]);

            chai.expect(db.medic.query.callCount).to.equal(1);
            chai.expect(db.medic.query.args[0][1]).to.deep.equal({ keys: ['a', 'b'], include_docs: true });
            chai.expect(registrationUtils.isValidRegistration.callCount).to.equal(0);
          });
        });
      });

      it('filters for valid registrations and connects them to the records', () => {
        const records = [
          { _id: 1, scheduled_tasks: [{ foo: 'bar' }], patient: { patient_id: 'a' } },
          { _id: 2, scheduled_tasks: [{ foo: 'bar' }], patient: { patient_id: 'c'} },
          { _id: 3, scheduled_tasks: [{ foo: 'bar' }], patient: { patient_id: 'b' } },
          { _id: 4, scheduled_tasks: [{ foo: 'bar' }], patient: { patient_id: 'a' } },
          { _id: 4, scheduled_tasks: [{ foo: 'bar' }], patient: { patient_id: 'd' } },
        ];

        db.medic.query.withArgs('medic-client/registered_patients').resolves({
          rows: [
            { key: 'a', doc: { _id: 'r1', patient_id: 'a', valid: false } },
            { key: 'b', doc: { _id: 'r2', patient_id: 'b', valid: true } },
            { key: 'c', doc: { _id: 'r3', fields: { patient_id: 'c' }, valid: true  } },
            { key: 'b', doc: { _id: 'r4', patient_id: 'b', valid: false } },
            { key: 'a', doc: { _id: 'r5', patient_id: 'a', valid: true } },
            { key: 'b', doc: { _id: 'r6', fields: { patient_id: 'b' }, valid: true } }
          ]
        });

        registrationUtils.isValidRegistration
          .withArgs(sinon.match({ valid: false })).returns(false)
          .withArgs(sinon.match({ valid: true })).returns(true);

        return service.map().then(({ hydrate }) => {
          return hydrate(records).then(result => {
            chai.expect(db.medic.query.callCount).to.equal(1);
            chai.expect(db.medic.query.args[0][1]).to.deep.equal({ keys: ['a', 'c', 'b', 'd'], include_docs: true });
            chai.expect(registrationUtils.isValidRegistration.callCount).to.equal(6);
            chai.expect(registrationUtils.isValidRegistration.args[0][0])
              .to.deep.equal({ _id: 'r1', patient_id: 'a', valid: false });
            chai.expect(registrationUtils.isValidRegistration.args[1][0])
              .to.deep.equal({ _id: 'r2', patient_id: 'b', valid: true });
            chai.expect(registrationUtils.isValidRegistration.args[2][0])
              .to.deep.equal({ _id: 'r3', fields: { patient_id: 'c' }, valid: true  });
            chai.expect(registrationUtils.isValidRegistration.args[3][0])
              .to.deep.equal({ _id: 'r4', patient_id: 'b', valid: false });
            chai.expect(registrationUtils.isValidRegistration.args[4][0])
              .to.deep.equal({ _id: 'r5', patient_id: 'a', valid: true } );
            chai.expect(registrationUtils.isValidRegistration.args[5][0])
              .to.deep.equal({ _id: 'r6', fields: { patient_id: 'b' }, valid: true });

            chai.expect(result[0].registrations).to.deep.equal([
              { _id: 'r5', patient_id: 'a', valid: true }
            ]);
            chai.expect(result[1].registrations).to.deep.equal([
              { _id: 'r3', fields: { patient_id: 'c' }, valid: true  }
            ]);
            chai.expect(result[2].registrations).to.deep.equal([
              { _id: 'r2', patient_id: 'b', valid: true },
              { _id: 'r6', fields: { patient_id: 'b' }, valid: true }
            ]);
            chai.expect(result[3].registrations).to.deep.equal([
              { _id: 'r5', patient_id: 'a', valid: true }
            ]);
            chai.expect(result[4].registrations).to.deep.equal([]);
          });
        });
      });

      it('throws query errors', () => {
        const records = [{ _id: 1, scheduled_tasks: [{ foo: 'bar' }], patient: { patient_id: 'a' } }];
        db.medic.query.rejects({ some: 'error' });

        return service.map().then(({ hydrate }) => {
          return hydrate(records)
            .then(() => chai.expect(0).to.equal('should have thrown'))
            .catch(err => chai.expect(err).to.deep.equal({ some: 'error' }));
        });
      });
    });

    describe('getRows', () => {
      it('works when message has no messages', () => {
        const record = {
          _id: 1,
          patient: { patient_id: 'a' },
          type: 'data-record',
          form: 'frm',
          reported_date: new Date('2018-01-01 12:00:00').getTime()
        };

        return service.map().then(({ getRows }) => {
          const result = getRows(record);
          chai.expect(result).to.deep.equal([]);
        });
      });

      it('works for responses', () => {
        const record = {
          _id: 'record_id',
          patient: { patient_id: '123' },
          reported_date: new Date('2018-01-01 12:00:00').getTime(),
          from: '12345678',
          responses: [
            { to: '898989', message: 'the response', uuid: '1' },
            { to: '909090', message: 'the response 2', uuid: '2' }
          ]
        };

        return service.map({}, {humanReadable: false}).then(({ getRows }) => {
          const result = getRows(record);
          chai.expect(result.length).to.equal(2);
          chai.expect(result[0]).to.deep.equal([
            'record_id',
            '123',
            new Date('2018-01-01 12:00:00').getTime(),
            '12345678',
            'Automated Reply',
            'sent',
            '',
            '',
            '',
            new Date('2018-01-01 12:00:00').getTime(),
            '',
            '',
            '1',
            undefined,
            '898989',
            'the response'
          ]);

          chai.expect(result[1]).to.deep.equal([
            'record_id',
            '123',
            new Date('2018-01-01 12:00:00').getTime(),
            '12345678',
            'Automated Reply',
            'sent',
            '',
            '',
            '',
            new Date('2018-01-01 12:00:00').getTime(),
            '',
            '',
            '2',
            undefined,
            '909090',
            'the response 2'
          ]);
        });
      });

      it('works for sms_messages', () => {
        const record = {
          _id: 'record_id',
          patient: { patient_id: '123' },
          reported_date: new Date('2018-01-01 12:00:00').getTime(),
          from: '12345678',
          sms_message: {
            message: 'the message'
          }
        };

        return service.map({}, {humanReadable: false}).then(({ getRows }) => {
          const result = getRows(record);
          chai.expect(result.length).to.equal(1);
          chai.expect(result[0]).to.deep.equal([
            'record_id',
            '123',
            new Date('2018-01-01 12:00:00').getTime(),
            '12345678',
            'Message',
            'received',
            new Date('2018-01-01 12:00:00').getTime(),
            '',
            '',
            '',
            '',
            '',
            undefined,
            '12345678',
            undefined,
            'the message'
          ]);
        });
      });

      it('works with tasks', () => {
        const record = {
          _id: 'id_record',
          patient: { patient_id: '456' },
          reported_date: new Date('2017-02-01 12:00:00').getTime(),
          from: '12345678',
          tasks: [{
            state: 'pending',
            timestamp: new Date('2017-02-01 12:00:00').getTime(),
            state_history: [{
              state: 'pending',
              timestamp: new Date('2017-02-01 12:00:00').getTime(),
            }],
            messages: [{
              message: 'message1',
              to: 'phone1',
              uuid: 1
            }]
          }, {
            state: 'forwarded-to-gateway',
            timestamp: new Date('2017-02-01 12:00:00').getTime(),
            state_history: [{
              state: 'pending',
              timestamp: new Date('2017-02-01 14:00:00').getTime(),
            }, {
              state: 'forwarded-to-gateway',
              timestamp: new Date('2017-02-02 12:00:00').getTime(),
            }],
            messages: [{
              message: 'message2',
              to: 'phone2',
              uuid: 2
            }]
          }]
        };

        return service.map({}, {humanReadable: false}).then(({ getRows }) => {
          const result = getRows(record);
          chai.expect(result.length).to.equal(2);
          chai.expect(result[0]).to.deep.equal([
            'id_record',
            '456',
            new Date('2017-02-01 12:00:00').getTime(),
            '12345678',
            'Task Message',
            'pending',
            '',
            '',
            new Date('2017-02-01 12:00:00').getTime(),
            '',
            '',
            '',
            1,
            undefined,
            'phone1',
            'message1'
          ]);

          chai.expect(result[1]).to.deep.equal([
            'id_record',
            '456',
            new Date('2017-02-01 12:00:00').getTime(),
            '12345678',
            'Task Message',
            'forwarded-to-gateway',
            '',
            '',
            new Date('2017-02-01 14:00:00').getTime(),
            '',
            '',
            '',
            2,
            undefined,
            'phone2',
            'message2'
          ]);
        });
      });

      it('works with scheduled tasks (generates messages and translates task names)', () => {
        const record = {
          _id: 'record',
          patient: { patient_id: '12345' },
          reported_date: new Date('2017-02-01 12:00:00').getTime(),
          from: '12345678',
          registrations: [{ _id: 'r1' }, { _id: 'r2' }],
          scheduled_tasks: [{
            state: 'scheduled',
            timestamp: new Date('2017-02-01 12:00:00').getTime(),
            state_history: [{
              state: 'scheduled',
              timestamp: new Date('2017-02-01 12:00:00').getTime(),
            }],
            due: new Date('2017-03-01').getTime(),
            type: 'my task type',
            messages: [{
              message: 'message1',
              to: 'phone1',
              uuid: 1
            }]
          }, {
            state: 'pending',
            timestamp: new Date('2017-02-01 12:00:00').getTime(),
            state_history: [{
              state: 'scheduled',
              timestamp: new Date('2017-02-01 12:00:00').getTime(),
            }, {
              state: 'pending',
              timestamp: new Date('2017-02-02 12:00:00').getTime(),
            }],
            translation_key: 'task-translation-key',
            group: 'gr',
            message_key: 'alpha',
            recipient: 'random recipient',
            due: new Date('2017-02-01').getTime()
          }]
        };

        config.translate.withArgs('task-translation-key').returns('my translated task name');
        messageUtils.generate.returns([{
          uuid: 'uuid2',
          to: 'phone2',
          message: 'message2'
        }]);

        config.get.returns({ config: 1 });

        return service.map({}, {humanReadable: false}).then(({ getRows }) => {
          const result = getRows(record);

          chai.expect(config.translate.callCount).to.equal(1);
          chai.expect(config.translate.args[0]).to.deep.equal(['task-translation-key', { group: 'gr' }]);

          chai.expect(messageUtils.generate.callCount).to.deep.equal(1);
          chai.expect(messageUtils.generate.args[0]).to.deep.equal([
            { config: 1 },
            config.translate,
            record,
            {
              translationKey: 'alpha',
              message: undefined
            },
            'random recipient',
            {
              patient: record.patient,
              registrations: record.registrations
            }
          ]);

          chai.expect(result.length).to.equal(2);
          chai.expect(result[0]).to.deep.equal([
            'record',
            '12345',
            new Date('2017-02-01 12:00:00').getTime(),
            '12345678',
            'my task type',
            'scheduled',
            '',
            new Date('2017-03-01').getTime(),
            '',
            '',
            '',
            '',
            1,
            undefined,
            'phone1',
            'message1'
          ]);

          chai.expect(result[1]).to.deep.equal([
            'record',
            '12345',
            new Date('2017-02-01 12:00:00').getTime(),
            '12345678',
            'my translated task name',
            'pending',
            '',
            new Date('2017-02-01').getTime(),
            new Date('2017-02-02 12:00:00').getTime(),
            '',
            '',
            '',
            'uuid2',
            undefined,
            'phone2',
            'message2'
          ]);
        });
      });
    });
  });
});
