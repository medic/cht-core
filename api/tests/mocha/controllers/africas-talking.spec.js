const sinon = require('sinon');
const chai = require('chai');
const controller = require('../../../src/controllers/africas-talking');
const messaging = require('../../../src/services/messaging');
const serverUtils = require('../../../src/server-utils');
const auth = require('../../../src/auth');

let res;

describe('Africas Talking controller', () => {

  beforeEach(() => res = { end: sinon.stub() });

  afterEach(() => sinon.restore());

  describe('incomingMessages', () => {

    it('returns error when no auth', () => {
      const req = {};
      sinon.stub(auth, 'check').rejects(new Error('nooo'));
      sinon.stub(serverUtils, 'error').returns();
      return controller.incomingMessages(req, res).then(() => {
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(res.end.callCount).to.equal(0);
      });
    });

    it('passes the message to the service', () => {
      const req = { body: { id: '123', from: '+456', text: 'gidday' } };
      sinon.stub(auth, 'check').resolves();
      sinon.stub(messaging, 'processIncomingMessages').resolves();
      return controller.incomingMessages(req, res).then(() => {
        chai.expect(messaging.processIncomingMessages.callCount).to.equal(1);
        chai.expect(messaging.processIncomingMessages.args[0][0]).to.deep.equal([
          { id: '123', from: '+456', content: 'gidday' }
        ]);
        chai.expect(res.end.callCount).to.equal(1);
      });
    });

  });

  describe('deliveryReports', () => {

    it('returns error when no auth', () => {
      sinon.stub(auth, 'check').rejects(new Error('nooo'));
      sinon.stub(serverUtils, 'error').returns();
      const req = {};
      return controller.deliveryReports(req, res).then(() => {
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(res.end.callCount).to.equal(0);
      });
    });

    it('returns error when unknown state', () => {
      sinon.stub(auth, 'check').resolves();
      sinon.stub(serverUtils, 'error').returns();
      const req = { body: { id: '123', status: 'unknown' } };
      return controller.deliveryReports(req, res).then(() => {
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(serverUtils.error.args[0][0]).to.deep.equal({
          code: 400,
          message: 'Unknown status code: "unknown", gateway message reference: "123"'
        });
        chai.expect(res.end.callCount).to.equal(0);
      });
    });

    it('passes the message to the service', () => {
      sinon.stub(auth, 'check').resolves();
      sinon.stub(messaging, 'updateMessageTaskStates').resolves();
      const req = { body: { id: '123', status: 'Buffered', failureReason: 'none' } };
      return controller.deliveryReports(req, res).then(() => {
        chai.expect(messaging.updateMessageTaskStates.callCount).to.equal(1);
        chai.expect(messaging.updateMessageTaskStates.args[0][0]).to.deep.equal([
          { messageId: 'TODO', state: 'sent', details: 'none', gateway_ref: '123' }
        ]);
        chai.expect(res.end.callCount).to.equal(1);
      });
    });

  });

});
