const chai = require('chai');
const sinon = require('sinon');
const db = require('../../../src/db');
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
      const dbPut = sinon.stub(db.medic, 'put').resolves();
      return service.upgrade(buildInfo, 'admin', {stageOnly: false})
        .then(() => {
          chai.expect(dbPut.callCount).to.equal(1);
          chai.expect(dbPut.args[0][0].build_info).to.deep.equal(buildInfo);
        });
    });

    it('supports creating a stageOnly work doc', () => {
      const dbPut = sinon.stub(db.medic, 'put').resolves();
      return service.upgrade(buildInfo, 'admin', {stageOnly: true})
        .then(() => {
          chai.expect(dbPut.callCount).to.equal(1);
          chai.expect(dbPut.args[0][0].action).to.equal('stage');
        });
    });
  });
});
