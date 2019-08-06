const sinon = require('sinon');
const chai = require('chai');
const secureSettings = require('@medic/settings');
const controller = require('../../../src/controllers/africas-talking');
const messaging = require('../../../src/services/messaging');
const serverUtils = require('../../../src/server-utils');

let res;

describe('Africa\'s Talking controller', () => {

  beforeEach(() => res = { json: sinon.stub() });

  afterEach(() => sinon.restore());

  describe('incomingMessages', () => {

    it('returns error when key not configured', () => {
      const req = { query: {} };
      sinon.stub(secureSettings, 'getCredentials').resolves();
      sinon.stub(serverUtils, 'error').returns();
      return controller.incomingMessages(req, res).then(() => {
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(res.json.callCount).to.equal(0);
      });
    });

    it('returns error when no key given', () => {
      const req = { query: {} };
      sinon.stub(secureSettings, 'getCredentials').resolves('mykey');
      sinon.stub(serverUtils, 'error').returns();
      return controller.incomingMessages(req, res).then(() => {
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(res.json.callCount).to.equal(0);
      });
    });

    it('returns error when key does not match', () => {
      const req = { query: 'wrong' };
      sinon.stub(secureSettings, 'getCredentials').resolves('mykey');
      sinon.stub(serverUtils, 'error').returns();
      return controller.incomingMessages(req, res).then(() => {
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(res.json.callCount).to.equal(0);
      });
    });

    it('passes the message to the service', () => {
      const req = {
        query: { key: 'mykey' },
        body: { id: '123', from: '+456', text: 'gidday' }
      };
      sinon.stub(secureSettings, 'getCredentials').resolves('mykey');
      sinon.stub(messaging, 'processIncomingMessages').resolves({ saved: 1 });
      return controller.incomingMessages(req, res).then(() => {
        chai.expect(messaging.processIncomingMessages.callCount).to.equal(1);
        chai.expect(messaging.processIncomingMessages.args[0][0]).to.deep.equal([
          { id: '123', from: '+456', content: 'gidday' }
        ]);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0][0]).to.deep.equal({ saved: 1 });
      });
    });

  });

  describe('deliveryReports', () => {

    it('returns error when key does not match', () => {
      const req = { query: { key: 'wrong' } };
      sinon.stub(secureSettings, 'getCredentials').resolves('mykey');
      sinon.stub(serverUtils, 'error').returns();
      return controller.deliveryReports(req, res).then(() => {
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(res.json.callCount).to.equal(0);
      });
    });

    it('returns error when unknown state', () => {
      sinon.stub(serverUtils, 'error').returns();
      const req = {
        query: { key: 'mykey' },
        body: { id: '123', status: 'unknown' }
      };
      sinon.stub(secureSettings, 'getCredentials').resolves('mykey');
      return controller.deliveryReports(req, res).then(() => {
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(serverUtils.error.args[0][0]).to.deep.equal({
          code: 400,
          message: 'Unknown status code: "unknown", gateway message reference: "123"'
        });
        chai.expect(res.json.callCount).to.equal(0);
      });
    });

    it('passes the message to the service', () => {
      sinon.stub(messaging, 'updateMessageTaskStates').resolves({ saved: 1 });
      const req = {
        query: { key: 'mykey' },
        body: { id: '123', status: 'Buffered', failureReason: 'none' }
      };
      sinon.stub(secureSettings, 'getCredentials').resolves('mykey');
      return controller.deliveryReports(req, res).then(() => {
        chai.expect(messaging.updateMessageTaskStates.callCount).to.equal(1);
        chai.expect(messaging.updateMessageTaskStates.args[0][0]).to.deep.equal([
          { state: 'sent', details: 'none', gatewayRef: '123' }
        ]);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0][0]).to.deep.equal({ saved: 1 });
      });
    });

  });

});
