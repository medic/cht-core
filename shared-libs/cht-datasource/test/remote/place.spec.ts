import sinon, { SinonStub } from 'sinon';
import { expect } from 'chai';
import * as Place from '../../src/remote/place';
import * as RemoteEnv from '../../src/remote/libs/data-context';
import { RemoteDataContext } from '../../src/remote/libs/data-context';

describe('remote place', () => {
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
      it('returns a place by UUID', async () => {
        const doc = { type: 'clinic' };
        getResourceInner.resolves(doc);

        const result = await Place.v1.get(remoteContext)(identifier);

        expect(result).to.equal(doc);
        expect(getResourceOuter.calledOnceWithExactly(remoteContext, 'api/v1/place')).to.be.true;
        expect(getResourceInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        getResourceInner.resolves(null);

        const result = await Place.v1.get(remoteContext)(identifier);

        expect(result).to.be.null;
        expect(getResourceOuter.calledOnceWithExactly(remoteContext, 'api/v1/place')).to.be.true;
        expect(getResourceInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
      });
    });

    describe('getWithLineage', () => {
      it('returns a place with lineage by UUID', async () => {
        const doc = { type: 'clinic' };
        getResourceInner.resolves(doc);

        const result = await Place.v1.getWithLineage(remoteContext)(identifier);

        expect(result).to.equal(doc);
        expect(getResourceOuter.calledOnceWithExactly(remoteContext, 'api/v1/place')).to.be.true;
        expect(getResourceInner.calledOnceWithExactly(identifier.uuid, { with_lineage: 'true' })).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        getResourceInner.resolves(null);

        const result = await Place.v1.getWithLineage(remoteContext)(identifier);

        expect(result).to.be.null;
        expect(getResourceOuter.calledOnceWithExactly(remoteContext, 'api/v1/place')).to.be.true;
        expect(getResourceInner.calledOnceWithExactly(identifier.uuid, { with_lineage: 'true' })).to.be.true;
      });
    });
  });
});
