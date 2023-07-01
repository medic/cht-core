const sinon = require('sinon');
const db = require('../../../src/db');
const serverUtils = require('../../../src/server-utils');

const controller =  require('../../../src/controllers/changes');
let req;
let res;

const expect = require('chai').expect;

describe('Changes controller', () => {
  afterEach(() => {
    sinon.restore();
  });
  beforeEach(() => {
    req = {
      userCtx: { name: 'user' }
    };
    res = {
      type: sinon.stub(),
      json: sinon.stub(),
    };
  });

  it('should respond with ddoc and service worker meta', async () => {
    sinon.stub(db.medic, 'changes').resolves({
      changes: [
        { id: 'service-worker-meta' },
        { id: '_design/medic-client', },
        { id: 'org.couchdb.user:user', },
        { id: 'settings' },
      ],
    });
    await controller.request(req, res);
    expect(db.medic.changes.args).to.deep.equal([[{ doc_ids: [
      '_design/medic-client',
      'service-worker-meta',
      'settings',
      'org.couchdb.user:user',
    ] }]]);
    expect(res.json.args).to.deep.equal([[{
      changes: [
        { id: 'service-worker-meta' },
        { id: '_design/medic-client', },
        { id: 'org.couchdb.user:user', },
        { id: 'settings' },
      ],
    }]]);
  });

  it('should fail on error', async () => {
    sinon.stub(db.medic, 'changes').rejects({ oh: 'no' });
    sinon.stub(serverUtils, 'error');

    await controller.request(req, res);
    expect(serverUtils.error.args).to.deep.equal([[{ oh: 'no' }, req, res]]);
  });
});
