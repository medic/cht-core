import sinon, { SinonStub } from 'sinon';
import { expect } from 'chai';
import * as Place from '../../src/remote/place';
import * as RemoteEnv from '../../src/remote/libs/data-context';
import { RemoteDataContext } from '../../src/remote/libs/data-context';

describe('remote place', () => {
  const remoteContext = {} as RemoteDataContext;
  let getResourceInner: SinonStub;
  let getResourceOuter: SinonStub;
  let getResourcesInner: SinonStub;
  let getResourcesOuter: SinonStub;
  let postResourceOuter: SinonStub;
  let postResourceInner: SinonStub;

  beforeEach(() => {
    getResourceInner = sinon.stub();
    getResourceOuter = sinon.stub(RemoteEnv, 'getResource').returns(getResourceInner);
    getResourcesInner = sinon.stub();
    getResourcesOuter = sinon.stub(RemoteEnv, 'getResources').returns(getResourcesInner);
    postResourceInner= sinon.stub();
    postResourceOuter = sinon.stub(RemoteEnv, 'postResource').returns(postResourceInner);
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

    describe('getPage', () => {
      const limit = 3;
      const cursor = '1';
      const placeType = 'place';
      const personTypeQualifier = { contactType: placeType };
      const queryParam = {
        limit: limit.toString(),
        type: placeType,
        cursor,
      };

      it('returns places', async () => {
        const doc = [{ type: 'place' }, {type: 'place'}];
        const expectedResponse = { data: doc, cursor };
        getResourcesInner.resolves(expectedResponse);

        const result = await Place.v1.getPage(remoteContext)(personTypeQualifier, cursor, limit);

        expect(result).to.equal(expectedResponse);
        expect(getResourcesOuter.calledOnceWithExactly(remoteContext, 'api/v1/place')).to.be.true;
        expect(getResourcesInner.calledOnceWithExactly(queryParam)).to.be.true;
      });

      it('returns empty array if docs are not found', async () => {
        getResourcesInner.resolves([]);

        const result = await Place.v1.getPage(remoteContext)(personTypeQualifier, cursor, limit);

        expect(result).to.deep.equal([]);
        expect(getResourcesOuter.calledOnceWithExactly(remoteContext, 'api/v1/place')).to.be.true;
        expect(getResourcesInner.calledOnceWithExactly(queryParam)).to.be.true;
      });
    });

    describe('createPlace', () => {
      it('creates a place for a valid input', async () => {
        const placeInput = {
          type: 'place',
          name: 'user-1',
          parent: 'p1'
        };
        const expected_doc = {...placeInput, _id: '2', _rev: '1'};
        postResourceInner.resolves(expected_doc);
        const result = await Place.v1.createPlace(remoteContext)(placeInput);
        expect(result).to.deep.equal(expected_doc);
        expect(postResourceOuter.calledOnceWithExactly(remoteContext, 'api/v1/place')).to.be.true;
        expect(postResourceInner.calledOnceWithExactly(placeInput)).to.be.true;
      });
    });
  });
});
