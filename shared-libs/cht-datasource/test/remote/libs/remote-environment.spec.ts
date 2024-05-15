import sinon, { SinonStub } from 'sinon';
import { fetchIdentifiedResource } from '../../../src/remote/libs/remote-environment';
import { expect } from 'chai';

describe('remote environment lib', () => {
  let fetchStub: SinonStub;
  let responseJson: SinonStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
    responseJson = sinon.stub();
  });

  afterEach(() => sinon.restore());

  describe('fetchIdentifiedResource', () => {
    it('fetches the identified resource', async () => {
      const resource = { hello: 'world' };
      responseJson.resolves(resource);
      fetchStub.resolves({ ok: true, json: responseJson });

      const result = await fetchIdentifiedResource('resource-path', 'identifier');

      expect(result).to.equal(resource);
      expect(fetchStub.calledOnceWithExactly('resource-path/identifier')).to.be.true;
      expect(responseJson.calledOnce).to.be.true;
    });

    it('returns null if the resource is not found', async () => {
      const response = { ok: false, json: responseJson };
      fetchStub.resolves(response);

      const result = await fetchIdentifiedResource('resource-path', 'identifier');

      expect(result).to.be.null;
      expect(fetchStub.calledOnceWithExactly('resource-path/identifier')).to.be.true;
      expect(responseJson.notCalled).to.be.true;
    });
  });
});
