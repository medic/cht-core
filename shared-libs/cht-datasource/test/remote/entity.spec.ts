import sinon, { SinonStub } from 'sinon';
import { expect } from 'chai';
import * as RemoteEnv from '../../src/remote/libs/data-context';
import { RemoteDataContext } from '../../src/remote/libs/data-context';

describe('remote entity', () => {
  const remoteContext = {} as RemoteDataContext;

  let Entity: typeof import('../../src/remote/entity');
  let getResourceInner: SinonStub;
  let getResourceOuter: SinonStub;

  before(() => {
    Reflect.deleteProperty(require.cache, require.resolve('../../src/remote/entity'));
    Entity = require('../../src/remote/entity');
  });

  beforeEach(() => {
    getResourceInner = sinon.stub();
    getResourceOuter = sinon.stub(RemoteEnv, 'getResource').returns(getResourceInner);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('v1', () => {
    const identifier = { uuid: 'uuid' } as const;

    describe('get', () => {
      it('returns an entity by UUID', async () => {
        const doc = { _id: 'uuid', type: 'some_type' };
        getResourceInner.resolves(doc);

        const result = await Entity.v1.get(remoteContext)(identifier);

        expect(result).to.equal(doc);
        expect(getResourceOuter.calledOnceWithExactly(remoteContext, 'api/v1/entity')).to.be.true;
        expect(getResourceInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        getResourceInner.resolves(null);

        const result = await Entity.v1.get(remoteContext)(identifier);

        expect(result).to.be.null;
        expect(getResourceOuter.calledOnceWithExactly(remoteContext, 'api/v1/entity')).to.be.true;
        expect(getResourceInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
      });
    });
  });
});
