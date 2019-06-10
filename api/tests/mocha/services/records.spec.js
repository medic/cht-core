const sinon = require('sinon');
const chai = require('chai');
const controller = require('../../../src/controllers/records');
const auth = require('../../../src/auth');
const messaging = require('../../../src/services/messaging');
const records = require('../../../src/services/records');
const config = require('../../../src/config');

describe('records controller', () => {

  let reqIs;
  let res;
  let transitionsLib;

  beforeEach(() => {
    sinon.stub(auth, 'check').resolves();
    reqIs = sinon.stub().returns(false);
    sinon.stub(records, 'createRecordByJSON');
    sinon.stub(records, 'createByForm');
    res = { json: sinon.stub() };
    transitionsLib = { processDocs: sinon.stub() };
    sinon.stub(config, 'getTransitionsLib').returns(transitionsLib);
    sinon.stub(messaging, 'send');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('create calls createRecordByJSON if json type', () => {
    reqIs.withArgs('json').returns('json'); // yes, it actually returns 'json'
    records.createRecordByJSON.returns({ message: 'one' });
    const req = {
      body: {
        message: 'test',
        from: '+123'
      },
      is: reqIs
    };

    transitionsLib.processDocs.resolves([{ ok: true, id: 'xyz' }]);

    return controller.v2(req, res).then(() => {
      chai.expect(res.json.callCount).to.equal(1);
      chai.expect(res.json.args[0][0]).to.deep.equal({ success: true, id: 'xyz' });
      chai.expect(records.createRecordByJSON.callCount).to.equal(1);
      chai.expect(records.createRecordByJSON.args[0][0]).to.deep.equal(req.body);
      chai.expect(records.createByForm.callCount).to.equal(0);
      chai.expect(transitionsLib.processDocs.callCount).to.equal(1);
      chai.expect(transitionsLib.processDocs.args[0]).to.deep.equal([[{ message: 'one' }]]);
      chai.expect(messaging.send.callCount).to.equal(1);
      chai.expect(messaging.send.args[0][0]).to.equal('xyz');
    });
  });

  it('create calls createByForm if urlencoded type', () => {
    reqIs.withArgs('urlencoded').returns('urlencoded');
    records.createByForm.returns({ message: 'one' });
    const req = {
      body: {
        message: 'test',
        from: '+123'
      },
      is: reqIs
    };
    transitionsLib.processDocs.resolves([{ ok: true, id: 'zyx' }]);

    return controller.v2(req, res).then(() => {
      chai.expect(res.json.callCount).to.equal(1);
      chai.expect(res.json.args[0][0]).to.deep.equal({ success: true, id: 'zyx' });
      chai.expect(records.createRecordByJSON.callCount).to.equal(0);
      chai.expect(records.createByForm.callCount).to.equal(1);
      chai.expect(records.createByForm.args[0][0]).to.deep.equal(req.body);
      chai.expect(transitionsLib.processDocs.callCount).to.equal(1);
      chai.expect(transitionsLib.processDocs.args[0]).to.deep.equal([[{ message: 'one' }]]);
      chai.expect(messaging.send.callCount).to.equal(1);
      chai.expect(messaging.send.args[0][0]).to.equal('zyx');
    });
  });

});
