const sinon = require('sinon');
const { expect } = require('chai');
const rewire = require('rewire');

const environment = require('../../../src/environment');
const db = require('../../../src/db');

let service;

describe('deploy info', () => {
  afterEach(() => {
    sinon.restore();
  });

  beforeEach(() => {
    service = rewire('../../../src/services/deploy-info');
  });

  describe('get', () => {
    it('should get deploy info from ddoc', async () => {
      const ddoc = {
        _id: '_design/medic',
        deploy_info: {
          timestamp: 1000,
          user: 'my user',
        },
        build_info: {
          base_version: '3.14.0',
          build: '3.14.0-56437856378453',
          time: 'human readable',
          version: 'aaa',
        },
        version: '3.14.0-dev.547839573',
      };

      sinon.stub(environment, 'ddoc').value('medic');
      sinon.stub(db.medic, 'get').resolves(ddoc);

      const deployInfo = await service.get();

      expect(deployInfo).to.deep.equal({
        timestamp: 1000,
        user: 'my user',
        version: '3.14.0-dev.547839573',
        base_version: '3.14.0',
        build: '3.14.0-56437856378453',
        time: 'human readable',
      });

      expect(db.medic.get.args).to.deep.equal([['_design/medic']]);
    });

    it('should cache deploy info', async () => {
      const ddoc = {
        _id: '_design/medic',
        deploy_info: {
          timestamp: 2000,
          user: 'admin',
          version: '4.0.0',
        },
        version: '4.0.0-beta.1',
      };

      sinon.stub(environment, 'ddoc').value('medic');
      sinon.stub(db.medic, 'get').resolves(ddoc);

      const deployInfo = await service.get();

      expect(deployInfo).to.deep.equal({
        timestamp: 2000,
        user: 'admin',
        version: '4.0.0-beta.1',
      });
      expect(db.medic.get.callCount).to.equal(1);

      expect(await service.get()).to.deep.equal(deployInfo);
      expect(await service.get()).to.deep.equal(deployInfo);
      expect(await service.get()).to.deep.equal(deployInfo);

      expect(db.medic.get.callCount).to.equal(1);
    });

    it('should work with undefined deploy info and build info', async () => {
      const ddoc = {
        _id: '_design/medic',
        version: '20000',
      };

      sinon.stub(environment, 'ddoc').value('medic');
      sinon.stub(db.medic, 'get').resolves(ddoc);

      expect(await service.get()).to.deep.equal({ version: '20000' });
    });

    it('should throw error when db.get fails', async () => {
      sinon.stub(environment, 'ddoc').value('medic');
      sinon.stub(db.medic, 'get').rejects({ error: 'whatever' });

      try {
        await service.get();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal({ error: 'whatever' });
      }
    });
  });
});

