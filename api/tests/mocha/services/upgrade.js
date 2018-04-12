require('chai').should();

const sinon = require('sinon').sandbox.create(),
      db = require('../../../db-pouch'),
      service = require('../../../services/upgrade');

describe('Upgrade service', () => {
  const buildInfo = {
    namespace: 'medic',
    application: 'medic',
    version: '1.0.0'
  };

  afterEach(() => sinon.restore());

  it('creates a work doc for horti to pick up', () => {
    sinon.stub(db, 'medic').value({
      put: sinon.stub().resolves()
    });
    service.upgrade(buildInfo, 'admin').then(() => {
      db.medic.put.callCount.should.equal(1);
      db.medic.put.args[0][0].build_info.should.deep.equal(buildInfo);
    });
  });
});
