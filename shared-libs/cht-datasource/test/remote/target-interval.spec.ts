import sinon, { SinonStub } from 'sinon';
import { expect } from 'chai';
import * as RemoteEnv from '../../src/remote/libs/data-context';
import { RemoteDataContext } from '../../src/remote/libs/data-context';
import * as TargetInterval from '../../src/remote/target-interval';

describe('remote target interval', () => {
  const remoteContext = {} as RemoteDataContext;
  let getResourceInner: SinonStub;
  let getResourceOuter: SinonStub;

  beforeEach(() => {
    getResourceInner = sinon.stub();
    getResourceOuter = sinon.stub(RemoteEnv, 'getResource').returns(getResourceInner);
  });

  afterEach(() => sinon.restore());

  describe('v1', () => {
    describe('get', () => {
      const identifier = { uuid: 'uuid' } as const;

      it('returns a target interval by UUID', async () => {
        const doc = {
          user: 'user',
          owner: 'owner',
          reporting_period: '2025-01',
          updated_date: 123,
          targets: [
            { id: 'target1', value: { pass: 5, total: 6 } },
            { id: 'target2', value: { pass: 8, total: 10, percent: 80 } },
          ]
        };
        getResourceInner.resolves(doc);

        const result = await TargetInterval.v1.get(remoteContext)(identifier);

        expect(result).to.equal(doc);
        expect(getResourceOuter).to.have.been.calledOnceWithExactly(remoteContext, 'api/v1/target-interval');
        expect(getResourceInner).to.have.been.calledOnceWithExactly(identifier.uuid);
      });

      it('returns null if the identified doc is not found', async () => {
        getResourceInner.resolves(null);

        const result = await TargetInterval.v1.get(remoteContext)(identifier);

        expect(result).to.be.null;
        expect(getResourceOuter).to.have.been.calledOnceWithExactly(remoteContext, 'api/v1/target-interval');
        expect(getResourceInner).to.have.been.calledOnceWithExactly(identifier.uuid);
      });
    });
  });
});
