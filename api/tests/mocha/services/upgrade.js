require('chai').should();

const sinon = require('sinon').sandbox.create();

const DB = require('../../../src/db-pouch').medic;
const service = require('../../../src/services/upgrade');

describe('Upgrade service', () => {
  const buildInfo = {
    namespace: 'medic',
    application: 'medic',
    version: '1.0.0'
  };

  afterEach(() => sinon.restore());

  describe('upgrade', () => {
    it('creates a work doc for horti to pick up', () => {
      DB.put = sinon.stub();
      DB.put.resolves();

      service.upgrade(buildInfo, 'admin', {stageOnly: false})
      .then(() => {
        DB.put.callCount.should.equal(1);
        DB.put.args[0][0].build_info.should.deep.equal(buildInfo);
      });
    });

    it('supports creating a stageOnly work doc', () => {
      DB.put = sinon.stub();
      DB.put.resolves();

      service.upgrade(buildInfo, 'admin', {stageOnly: true})
      .then(() => {
        DB.put.callCount.should.equal(1);
        DB.put.args[0][0].build_info.stageOnly.equal(true);
      });
    });
  });
});
