const sinon = require('sinon'),
      chai = require('chai'),
      service = require('../../../../src/services/export/message-mapper'),
      messageUtils = require('@shared-libs/message-utils'),
      registrationUtils = require('@shared-libs/registration-utils'),
      db = require('../../../../src/db-pouch'),
      config = require('../../../../src/config');

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
        chai.expect(db.medic.query.args[0]).to.deep.equal([ 'medic-sms/tasks_messages', options ]);
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
    });
  });
});
