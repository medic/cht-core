const sinon = require('sinon');
const chai = require('chai');
const config = require('../../../src/config');
const controller = require('../../../src/controllers/africas-talking');
const messaging = require('../../../src/services/messaging');
const serverUtils = require('../../../src/server-utils');

let res;

describe('Africas Talking controller', () => {

  beforeEach(() => res = { json: sinon.stub() });

  afterEach(() => sinon.restore());

  describe('incomingMessages', () => {

    it('returns error when not using https', () => {
      const req = {
        connection: { localAddress: 'a', remoteAddress: 'b' },
        ip: '1.2.3.4',
        protocol: 'http'
      };
      sinon.stub(config, 'get').returns({ africas_talking: { allowed_ips: [ '1.2.3.4' ] } });
      sinon.stub(serverUtils, 'error').returns();
      controller.incomingMessages(req, res);
      chai.expect(serverUtils.error.callCount).to.equal(1);
      chai.expect(res.json.callCount).to.equal(0);
    });

    it('returns error when ip not allowed', () => {
      const req = {
        connection: { localAddress: 'a', remoteAddress: 'b' },
        ip: '1.2.3.4',
        protocol: 'https',
      };
      sinon.stub(serverUtils, 'error').returns();
      controller.incomingMessages(req, res);
      chai.expect(serverUtils.error.callCount).to.equal(1);
      chai.expect(res.json.callCount).to.equal(0);
    });

    it('passes the message to the service', () => {
      const req = {
        connection: { localAddress: 'a', remoteAddress: 'b' },
        ip: '1.2.3.4',
        protocol: 'https',
        body: { id: '123', from: '+456', text: 'gidday' }
      };
      sinon.stub(config, 'get').returns({ africas_talking: { allowed_ips: [ '1.2.3.4' ] } });
      sinon.stub(messaging, 'processIncomingMessages').resolves();
      return controller.incomingMessages(req, res).then(() => {
        chai.expect(messaging.processIncomingMessages.callCount).to.equal(1);
        chai.expect(messaging.processIncomingMessages.args[0][0]).to.deep.equal([
          { id: '123', from: '+456', content: 'gidday' }
        ]);
        chai.expect(res.json.callCount).to.equal(1);
      });
    });

    it('allows http when localhost', () => {
      const req = {
        connection: { localAddress: 'a', remoteAddress: 'a' },
        ip: '127.0.0.1',
        protocol: 'http',
        body: { id: '123', from: '+456', text: 'gidday' }
      };
      sinon.stub(config, 'get').returns({ africas_talking: { allowed_ips: [ '127.0.0.1' ] } });
      sinon.stub(messaging, 'processIncomingMessages').resolves();
      sinon.stub(serverUtils, 'error');
      return controller.incomingMessages(req, res).then(() => {
        chai.expect(serverUtils.error.callCount).to.equal(0);
        chai.expect(res.json.callCount).to.equal(1);
      });
    });

  });

  describe('deliveryReports', () => {

    it('returns error when ip not allowed', () => {
      sinon.stub(serverUtils, 'error').returns();
      const req = {
        connection: { localAddress: 'a', remoteAddress: 'b' },
        protocol: 'http',
        ip: '1.2.3.4'
      };
      controller.deliveryReports(req, res);
      chai.expect(serverUtils.error.callCount).to.equal(1);
      chai.expect(res.json.callCount).to.equal(0);
    });

    it('returns error when unknown state', () => {
      sinon.stub(serverUtils, 'error').returns();
      const req = {
        connection: { localAddress: 'a', remoteAddress: 'b' },
        ip: '1.2.3.4',
        protocol: 'https',
        body: { id: '123', status: 'unknown' }
      };
      sinon.stub(config, 'get').returns({ africas_talking: { allowed_ips: [ '1.2.3.4' ] } });
      controller.deliveryReports(req, res);
      chai.expect(serverUtils.error.callCount).to.equal(1);
      chai.expect(serverUtils.error.args[0][0]).to.deep.equal({
        code: 400,
        message: 'Unknown status code: "unknown", gateway message reference: "123"'
      });
      chai.expect(res.json.callCount).to.equal(0);
    });

    it('passes the message to the service', () => {
      sinon.stub(messaging, 'updateMessageTaskStates').resolves();
      const req = {
        connection: { localAddress: 'a', remoteAddress: 'b' },
        ip: '1.2.3.4',
        protocol: 'https',
        body: { id: '123', status: 'Buffered', failureReason: 'none' }
      };
      sinon.stub(config, 'get').returns({ africas_talking: { allowed_ips: [ '1.2.3.4' ] } });
      return controller.deliveryReports(req, res).then(() => {
        chai.expect(messaging.updateMessageTaskStates.callCount).to.equal(1);
        chai.expect(messaging.updateMessageTaskStates.args[0][0]).to.deep.equal([
          { state: 'sent', details: 'none', gatewayRef: '123' }
        ]);
        chai.expect(res.json.callCount).to.equal(1);
      });
    });

  });

});
