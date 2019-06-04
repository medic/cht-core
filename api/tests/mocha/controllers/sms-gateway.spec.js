const chai = require('chai');
const sinon = require('sinon');

const controller = require('../../../src/controllers/sms-gateway');
const messaging = require('../../../src/services/messaging');
const records = require('../../../src/services/records');
const db = require('../../../src/db');
const config = require('../../../src/config');
const auth = require('../../../src/auth');
const serverUtils = require('../../../src/server-utils');

const res = sinon.stub({ json: () => {} });

describe('sms-gateway controller', () => {

  afterEach(() => {
    sinon.restore();
  });

  describe('get', () => {

    it('returns error if no auth', () => {
      const req = sinon.stub();
      const err = new Error('nope');
      sinon.stub(auth, 'check').rejects(err);
      sinon.stub(serverUtils, 'error').resolves();
      return controller.get(req, res).then(() => {
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(serverUtils.error.args[0][0]).to.equal(err);
      });
    });

    it('returns sms-gateway compatibility', () => {
      const req = sinon.stub();
      sinon.stub(auth, 'check').resolves();
      sinon.stub(res, 'json').returns();
      return controller.get(req, res).then(() => {
        chai.expect(res.json.callCount).to.equal(1);
        const actual = res.json.args[0][0];
        chai.expect(actual).to.deep.equal({ 'medic-gateway': true });
      });
    });

  });

  describe('post', () => {

    it('saves WT messages to DB', () => {
      // given
      sinon.stub(auth, 'check').resolves();
      const createRecord = sinon.stub(records, 'createByForm')
        .onCall(0).returns({ message: 'one' })
        .onCall(1).returns({ message: 'two' })
        .onCall(2).returns({ message: 'three' });
      const getOutgoingMessages = sinon.stub(messaging, 'getOutgoingMessages').resolves([]);
      const updateMessageTaskStates = sinon.stub(messaging, 'updateMessageTaskStates');
      updateMessageTaskStates.resolves({});

      sinon.stub(db.medic, 'query')
          .returns(Promise.resolve({ offset:0, total_rows:0, rows:[] }));

      sinon.stub(messaging, 'isMedicGatewayEnabled').returns(true);

      const req = { body: {
        messages: [
          { id:'1', from:'+1', content:'one'   },
          { id:'2', from:'+2', content:'two'   },
          { id:'3', from:'+3', content:'three' },
        ]
      } };

      const transitionsLib = { processDocs: sinon.stub()};
      sinon.stub(config, 'getTransitionsLib').returns(transitionsLib);
      transitionsLib.processDocs.resolves([{ ok: true, id: 'id' }, { ok: true, id: 'id' }, { ok: true, id: 'id' }]);

      // when
      return controller.post(req, res).then(() => {
        // then
        chai.expect(getOutgoingMessages.callCount).to.equal(1);
        chai.expect(createRecord.callCount).to.equal(3);
        chai.expect(createRecord.args[0][0]).to.deep.equal({ gateway_ref: '1', from: '+1', message: 'one'   });
        chai.expect(createRecord.args[1][0]).to.deep.equal({ gateway_ref: '2', from: '+2', message: 'two'   });
        chai.expect(createRecord.args[2][0]).to.deep.equal({ gateway_ref: '3', from: '+3', message: 'three' });
        chai.expect(transitionsLib.processDocs.callCount).to.equal(1);
        chai.expect(transitionsLib.processDocs.args[0]).to.deep.equal([[
          { message: 'one' },
          { message: 'two' },
          { message: 'three' }
        ]]);
      });
    });

    it('updates statuses supplied in request', () => {
      // given
      sinon.stub(auth, 'check').resolves();
      const updateMessageTaskStates = sinon.stub(messaging, 'updateMessageTaskStates');
      updateMessageTaskStates.resolves();

      sinon.stub(messaging, 'getOutgoingMessages').resolves([]);

      const req = { body: {
        updates: [
          { id:'1', status:'UNSENT' },
          { id:'2', status:'PENDING' },
          { id:'3', status:'SENT' },
          { id:'4', status:'DELIVERED' },
          { id:'5', status:'FAILED', reason:'bad' },
        ],
      } };

      const transitionsLib = { processDocs: sinon.stub()};
      sinon.stub(config, 'getTransitionsLib').returns(transitionsLib);
      transitionsLib.processDocs.resolves([]);

      // when
      return controller.post(req, res).then(() => {
        // then
        chai.expect(updateMessageTaskStates.args[0][0]).to.deep.equal([
          { messageId: '1', state:'received-by-gateway' },
          { messageId: '2', state:'forwarded-by-gateway'},
          { messageId: '3', state:'sent' },
          { messageId: '4', state:'delivered' },
          { messageId: '5', state:'failed', details:{ reason:'bad' } },
        ]);
      });
    });

    it('persists unknown statuses', () => {
      // given
      sinon.stub(auth, 'check').resolves();
      const updateMessageTaskStates = sinon.stub(messaging, 'updateMessageTaskStates');
      updateMessageTaskStates.resolves();

      sinon.stub(messaging, 'getOutgoingMessages').resolves([]);

      const req = { body: {
        updates: [
          { id:'1', status:'INVENTED-1' },
          { id:'2', status:'INVENTED-2' },
        ],
      } };

      // when
      return controller.post(req, res).then(() => {
        // then
        chai.expect(updateMessageTaskStates.args[0][0]).to.deep.equal([
          { messageId: '1', state:'unrecognised', details:{ gateway_status:'INVENTED-1' }},
          { messageId: '2', state:'unrecognised', details:{ gateway_status:'INVENTED-2' }},
        ]);
      });
    });

    it('provides WO messages in response', () => {
      // given
      sinon.stub(auth, 'check').resolves();
      sinon.stub(res, 'json').returns();
      sinon.stub(messaging, 'getOutgoingMessages').resolves([
        { id:'1', to:'+1', content:'one' },
        { id:'2', to:'+2', content:'two' },
        { id:'3', to:'+3', content:'three' },
      ]);
      sinon.stub(messaging, 'isMedicGatewayEnabled').returns(true);
      const updateMessageTaskStates = sinon.stub(messaging, 'updateMessageTaskStates');
      updateMessageTaskStates.resolves();

      const req = { body: {} };

      // when
      return controller.post(req, res).then(() => {
        // then
        chai.expect(res.json.callCount).to.equal(1);
        const actual = res.json.args[0][0];
        chai.expect(actual).to.deep.equal({
          messages: [
            { id:'1', to:'+1', content:'one' },
            { id:'2', to:'+2', content:'two' },
            { id:'3', to:'+3', content:'three' },
          ],
        });
        chai.expect(updateMessageTaskStates.callCount).to.equal(1);
        chai.expect(updateMessageTaskStates.args[0][0]).to.deep.equal([
          { messageId: '1', state:'forwarded-to-gateway' },
          { messageId: '2', state:'forwarded-to-gateway' },
          { messageId: '3', state:'forwarded-to-gateway' },
        ]);
      });
    });

    it('returns err if something goes wrong', () => {
      sinon.stub(auth, 'check').resolves();
      sinon.stub(messaging, 'isMedicGatewayEnabled').returns(true);
      sinon.stub(records, 'createByForm').onCall(0).returns({ message: 'one' });
      // sinon.stub(db.medic, 'bulkDocs').returns(Promise.reject(new Error('oh no!')));
      sinon.stub(db.medic, 'query')
        .returns(Promise.resolve({ offset:0, total_rows:0, rows:[] }));
      sinon.stub(messaging, 'getOutgoingMessages').resolves([]);
      // sinon.stub(messaging, 'updateMessageTaskStates').returns(Promise.reject(new Error('oh no!')));
      sinon.stub(messaging, 'updateMessageTaskStates').returns(Promise.reject(new Error('oh no!')));

      const req = { body: {
        messages: [
          { id:'1', from:'+1', content:'one'   },
        ]
      } };

      const transitionsLib = { processDocs: sinon.stub()};
      sinon.stub(config, 'getTransitionsLib').returns(transitionsLib);
      transitionsLib.processDocs.resolves([]);

      sinon.stub(serverUtils, 'error').resolves();
      return controller.post(req, res).then(() => {
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(serverUtils.error.args[0][0].message).to.equal('oh no!');
      });

    });

  });

});
