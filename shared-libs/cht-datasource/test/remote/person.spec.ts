import sinon from 'sinon';
import { expect } from 'chai';
import * as Person from '../../src/remote/person';
import * as RemoteEnv from '../../src/remote/libs/remote-environment';

describe('remote person', () => {
  let fetchIdentifiedResource: sinon.SinonStub;

  beforeEach(() => {
    fetchIdentifiedResource = sinon.stub(RemoteEnv, 'fetchIdentifiedResource');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('V1', () => {
    describe('get', () => {
      it('returns a person by UUID', async () => {
        const identifier = { uuid: 'uuid' };
        const doc = { type: 'person' };
        fetchIdentifiedResource.resolves(doc);

        const result = await Person.V1.get(identifier);

        expect(result).to.equal(doc);
        expect(fetchIdentifiedResource.calledOnceWithExactly('api/v1/person', identifier.uuid)).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        fetchIdentifiedResource.resolves(null);

        const result = await Person.V1.get({ uuid: 'uuid' });

        expect(result).to.be.null;
        expect(fetchIdentifiedResource.calledOnceWithExactly('api/v1/person', 'uuid')).to.be.true;
      });
    });
  });
});
