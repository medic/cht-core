const chai = require('chai');
const { expect } = chai;
chai.use(require('chai-exclude'));
const sinon = require('sinon');
const request = require('@medic/couch-request');
const environment = require('@medic/environment');

const rewire = require('rewire');
let serverInfo;


describe('server-info', () => {
  describe('deploy info', () => {
    beforeEach(() => {
      sinon.stub(environment, 'couchUrl').value('http://admin:pass@localhost:5984/medicdb');
      sinon.stub(environment, 'ddoc').value('medic');
    });

    afterEach(() => {
      sinon.restore();
    });

    describe('getDeployInfo', () => {
      it('should return deploy info with version from build_info', async () => {
        const ddoc = {
          _id: '_design/medic',
          build_info: {
            version: '4.1.0',
            date: '2023-01-01',
            base_version: '4.0.0'
          },
          deploy_info: {
            timestamp: '2023-01-02'
          }
        };

        sinon.stub(request, 'get').resolves(ddoc);

        serverInfo = rewire('../src/index');

        const result = await serverInfo.getDeployInfo();
        expect(result).to.deep.equal({
          version: '4.1.0',
          date: '2023-01-01',
          base_version: '4.0.0',
          timestamp: '2023-01-02'
        });
        expect(request.get.callCount).to.equal(1);
        expect(request.get.args).to.deep.equal([[{url: 'http://admin:pass@localhost:5984/medicdb/_design/medic'}]]);
      });

      it('should use cache on subsequent calls', async () => {
        const ddoc = {
          _id: '_design/medic',
          build_info: { version: '4.1.0' }
        };

        sinon.stub(request, 'get').resolves(ddoc);
        serverInfo = rewire('../src/index');

        const result1 = await serverInfo.getDeployInfo();
        const result2 = await serverInfo.getDeployInfo();

        expect(result1).to.deep.equal(result2);
        expect(request.get.callCount).to.equal(1);
      });

      it('should throw error if request fails', async () => {
        sinon.stub(request, 'get').rejects(new Error('Failed to fetch'));
        serverInfo = rewire('../src/index');

        await expect(serverInfo.getDeployInfo()).to.eventually.be.rejectedWith('Failed to fetch');
      });

      it('should clear cache when requested', async () => {
        const ddoc = {
          _id: '_design/medic',
          build_info: { version: '4.1.0' }
        };
        sinon.stub(request, 'get').resolves(ddoc);
        serverInfo = rewire('../src/index');

        const result1 = await serverInfo.getDeployInfo();
        const result2 = await serverInfo.getDeployInfo();

        expect(result1).to.deep.equal(result2);
        expect(result1.version).to.equal(ddoc.build_info.version);
        expect(request.get.callCount).to.equal(1);

        ddoc.build_info.version = '4.2.0';
        request.get.resolves(ddoc);

        expect((await serverInfo.getDeployInfo()).version).to.equal('4.1.0');
        expect(request.get.callCount).to.equal(1);
        expect((await serverInfo.getDeployInfo(true)).version).to.equal('4.2.0');
        expect(request.get.callCount).to.equal(2);
        expect((await serverInfo.getDeployInfo()).version).to.equal('4.2.0');
        expect(request.get.callCount).to.equal(2);
      });

      it('should fall back to deploy_info.build when build_info.version is invalid', async () => {
        const ddoc = {
          _id: '_design/medic',
          build_info: { version: 'not-semver' },
          deploy_info: { build: '3.5.0' }
        };

        sinon.stub(request, 'get').resolves(ddoc);
        serverInfo = rewire('../src/index');

        const result = await serverInfo.getDeployInfo();
        expect(result.version).to.equal('3.5.0');
      });

      it('should fall back to ddoc.version when semver fields are invalid', async () => {
        const ddoc = {
          _id: '_design/medic',
          build_info: { version: 'invalid' },
          deploy_info: { build: 'also-invalid' },
          version: 'my-custom-version'
        };

        sinon.stub(request, 'get').resolves(ddoc);
        serverInfo = rewire('../src/index');

        const result = await serverInfo.getDeployInfo();
        expect(result.version).to.equal('my-custom-version');
      });

      it('should return unknown when no version fields are available', async () => {
        const ddoc = {
          _id: '_design/medic',
        };

        sinon.stub(request, 'get').resolves(ddoc);
        serverInfo = rewire('../src/index');

        const result = await serverInfo.getDeployInfo();
        expect(result.version).to.equal('unknown');
      });
    });

    describe('getVersion', () => {
      it('should return version from deploy info', async () => {
        const ddoc = {
          _id: '_design/medic',
          build_info: { version: '4.1.0' }
        };

        sinon.stub(request, 'get').resolves(ddoc);
        serverInfo = rewire('../src/index');

        const version = await serverInfo.getVersion();
        expect(version).to.equal('4.1.0');
      });

      it('should return unknown on error', async () => {
        sinon.stub(request, 'get').rejects(new Error('Failed to fetch'));
        serverInfo = rewire('../src/index');

        const version = await serverInfo.getVersion();
        expect(version).to.equal('unknown');
      });
    });
  });
});
