import sinon, { SinonStub } from 'sinon';
import { expect } from 'chai';
import * as Person from '../../src/remote/person';
import * as RemoteEnv from '../../src/remote/libs/data-context';
import { RemoteDataContext } from '../../src/remote/libs/data-context';

describe('remote person', () => {
  const remoteContext = {} as RemoteDataContext;
  let getResourceInner: SinonStub;
  let getResourceOuter: SinonStub;

  beforeEach(() => {
    getResourceInner = sinon.stub();
    getResourceOuter = sinon.stub(RemoteEnv, 'getResource').returns(getResourceInner);
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
  });
});
