const sinon = require('sinon');
const db = require('../../../src/db');
const serverUtils = require('../../../src/server-utils');
const { DOC_IDS } = require('@medic/constants');

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
        { id: DOC_IDS.SERVICE_WORKER_META },
        { id: '_design/medic-client', },
        { id: 'org.couchdb.user:user', },
        { id: DOC_IDS.SETTINGS },
      ],
    });
    await controller.request(req, res);
    expect(db.medic.changes.args).to.deep.equal([[{ doc_ids: [
      '_design/shared',
      '_design/shared-contacts',
      '_design/shared-reports',
      '_design/webapp-contacts',
      '_design/webapp-reports',
      DOC_IDS.SERVICE_WORKER_META,
      DOC_IDS.SETTINGS,
      'org.couchdb.user:user',
    ] }]]);
    expect(res.json.args).to.deep.equal([[{
      changes: [
        { id: DOC_IDS.SERVICE_WORKER_META },
        { id: '_design/medic-client', },
        { id: 'org.couchdb.user:user', },
        { id: DOC_IDS.SETTINGS },
      ],
    }]]);
  });

  it('should fail on error', async () => {
    const err =  new Error('oh no');
    sinon.stub(db.medic, 'changes').rejects(err);
    sinon.stub(serverUtils, 'error');

    await controller.request(req, res);
    expect(serverUtils.error.args).to.deep.equal([[err, req, res]]);
  });
});
