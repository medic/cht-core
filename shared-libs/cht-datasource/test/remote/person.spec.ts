import sinon, { SinonStub } from 'sinon';
import { expect } from 'chai';
import * as Person from '../../src/remote/person';
import * as RemoteEnv from '../../src/remote/libs/data-context';
import { RemoteDataContext } from '../../src/remote/libs/data-context';

describe('remote person', () => {
  const remoteContext = {} as RemoteDataContext;
  let getResourceInner: SinonStub;
  let getResourceOuter: SinonStub;
  let getResourcesInner: SinonStub;
  let getResourcesOuter: SinonStub;

  beforeEach(() => {
    getResourceInner = sinon.stub();
    getResourceOuter = sinon.stub(RemoteEnv, 'getResource').returns(getResourceInner);
    getResourcesInner = sinon.stub();
    getResourcesOuter = sinon.stub(RemoteEnv, 'getResources').returns(getResourcesInner);
  });

  afterEach(() => sinon.restore());

  describe('v1', () => {
    const identifier = { uuid: 'uuid' } as const;

    describe('get', () => {
      it('returns a person by UUID', async () => {
        const doc = { type: 'person' };
        getResourceInner.resolves(doc);

        const result = await Person.v1.get(remoteContext)(identifier);

        expect(result).to.equal(doc);
        expect(getResourceOuter.calledOnceWithExactly(remoteContext, 'api/v1/person')).to.be.true;
        expect(getResourceInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        getResourceInner.resolves(null);

        const result = await Person.v1.get(remoteContext)(identifier);

        expect(result).to.be.null;
        expect(getResourceOuter.calledOnceWithExactly(remoteContext, 'api/v1/person')).to.be.true;
        expect(getResourceInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
      });
    });

    describe('getWithLineage', () => {
      it('returns a person with lineage by UUID', async () => {
        const doc = { type: 'person' };
        getResourceInner.resolves(doc);

        const result = await Person.v1.getWithLineage(remoteContext)(identifier);

        expect(result).to.equal(doc);
        expect(getResourceOuter.calledOnceWithExactly(remoteContext, 'api/v1/person')).to.be.true;
        expect(getResourceInner.calledOnceWithExactly(identifier.uuid, { with_lineage: 'true' })).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        getResourceInner.resolves(null);

        const result = await Person.v1.getWithLineage(remoteContext)(identifier);

        expect(result).to.be.null;
        expect(getResourceOuter.calledOnceWithExactly(remoteContext, 'api/v1/person')).to.be.true;
        expect(getResourceInner.calledOnceWithExactly(identifier.uuid, { with_lineage: 'true' })).to.be.true;
      });
    });

    describe('getPage', () => {
      const limit = 3;
      const skip = 1;
      const personType = 'person';
      const personTypeQualifier = {contactType: personType};
      const queryParam = {
        limit: limit.toString(),
        skip: skip.toString(),
        personType
      };

      it('returns people', async () => {
        const doc = [{ type: 'person' }, {type: 'person'}];
        getResourcesInner.resolves(doc);

        const result = await Person.v1.getPage(remoteContext)(personTypeQualifier, limit, skip);

        expect(result).to.equal(doc);
        expect(getResourcesOuter.calledOnceWithExactly(remoteContext, 'api/v1/person')).to.be.true;
        expect(getResourcesInner.calledOnceWithExactly(queryParam)).to.be.true;
      });

      it('returns empty array if docs are not found', async () => {
        getResourcesInner.resolves([]);

        const result = await Person.v1.getPage(remoteContext)(personTypeQualifier, limit, skip);

        expect(result).to.deep.equal([]);
        expect(getResourcesOuter.calledOnceWithExactly(remoteContext, 'api/v1/person')).to.be.true;
        expect(getResourcesInner.calledOnceWithExactly(queryParam)).to.be.true;
      });
    });
  });
});
