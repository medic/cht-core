require('chai').should();

const sinon = require('sinon').sandbox.create();

const DB = require('../../../db-pouch').medic;
const service = require('../../../services/upgrade');

describe('Upgrade service', () => {
  const buildInfo = {
    namespace: 'medic',
    application: 'medic',
    version: '1.0.0'
  };

  afterEach(() => sinon.restore());

  it('creates a work doc for horti to pick up', () => {
    sinon.stub(DB, 'put').returns(Promise.resolve());

    service.upgrade(buildInfo, 'admin')
    .then(() => {
      DB.put.callCount.should.equal(1);
      DB.put.args[0][0].build_info.should.deep.equal(buildInfo);
    });
  });
});
