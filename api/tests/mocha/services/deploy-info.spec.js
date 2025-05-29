const sinon = require('sinon');
const { expect } = require('chai');
const rewire = require('rewire');

const fs = require('fs');

const serverInfo = require('@medic/server-info');
const resources = require('../../../src/resources');

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
      const deployInfo = {
        timestamp: 1000,
        user: 'my user',
        version: '4.6.0',
        base_version: '4.6.0',
        build: '4.6.0.6922454971',
        time: 'human readable',
      };

      sinon.stub(serverInfo, 'getDeployInfo').resolves(deployInfo);

      const result = await service.get();

      expect(result).to.deep.equal(deployInfo);
      expect(serverInfo.getDeployInfo.callCount).to.equal(1);
    });

    it('should work with undefined deploy info and build info', async () => {
      const deployInfo = { version: '20000' };

      sinon.stub(serverInfo, 'getDeployInfo').resolves(deployInfo);

      expect(await service.get()).to.deep.equal(deployInfo);
    });

    it('should throw error when getDeployInfo fails', async () => {
      const error = { error: 'whatever' };
      sinon.stub(serverInfo, 'getDeployInfo').rejects(error);

      try {
        await service.get();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).to.deep.equal(error);
      }
    });
  });

  describe('store', () => {
    it('should store deploy info json in webapp build folder', async () => {
      sinon.stub(resources, 'webappPath').value('/webapp-path/');
      sinon.stub(fs.promises, 'writeFile').resolves();

      service = rewire('../../../src/services/deploy-info');

      const deployInfo = {
        timestamp: 2000,
        user: 'admin',
        version: '4.10.0-beta.1',
      };

      sinon.stub(serverInfo, 'getDeployInfo').resolves(deployInfo);

      await service.store();

      expect(fs.promises.writeFile.calledOnce).to.equal(true);
      expect(fs.promises.writeFile.args[0]).to.deep.equal([
        '/webapp-path/deploy-info.json',
        JSON.stringify(deployInfo)
      ]);
    });
  });
});
