import sinon, { SinonStub } from 'sinon';
import { expect } from 'chai';
import * as RemoteEnv from '../../src/remote/libs/data-context';
import { RemoteDataContext } from '../../src/remote/libs/data-context';
import * as TargetInterval from '../../src/remote/target-interval';
import { ContactUuidsQualifier, ReportingPeriodQualifier } from '../../src/qualifier';

describe('remote target interval', () => {
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

    describe('getPage', () => {
      const doc = [
        {
          type: 'target',
          user: 'user-1',
          owner: 'd3f6b91e-b095-48ef-a524-705e29fd9f6d',
          reporting_period: '2025-01',
          updated_date: 123,
          targets: [
            { id: 'target1', value: { pass: 5, total: 6 } },
            { id: 'target2', value: { pass: 8, total: 10, percent: 80 } },
          ]
        },
        {
          type: 'target',
          user: 'user-2',
          owner: 'c4e6b91e-b095-48ef-b524-805e28fd9c7d',
          reporting_period: '2025-01',
          updated_date: 123,
          targets: [
            { id: 'target1', value: { pass: 5, total: 6 } },
            { id: 'target2', value: { pass: 8, total: 10, percent: 80 } },
          ]
        }
      ];

      const limit = 3;
      const cursor = '1';
      const qualifier = {
        contactUuids: ['c4e6b91e-b095-48ef-b524-805e28fd9c7d', 'd3f6b91e-b095-48ef-a524-705e29fd9f6d'], 
        reportingPeriod: '2025-01'
      } as (ReportingPeriodQualifier & ContactUuidsQualifier);
      
      const queryParam = {
        limit: limit.toString(),
        reporting_period: '2025-01',
        contact_uuids: 'c4e6b91e-b095-48ef-b524-805e28fd9c7d,d3f6b91e-b095-48ef-a524-705e29fd9f6d',
        cursor
      };

      it('returns target intervals', async () => {
        const expectedResponse = { data: doc, cursor };
        getResourcesInner.resolves(expectedResponse);

        const result = await TargetInterval.v1.getPage(remoteContext)(qualifier, cursor, limit);

        expect(result).to.equal(expectedResponse);
        expect(getResourcesOuter.calledOnceWithExactly(remoteContext, 'api/v1/target-interval')).to.be.true;
        
        expect(getResourcesInner.callCount).to.be.equal(1);
        expect(getResourcesInner.calledOnceWithExactly(queryParam)).to.be.true;
      });

      it('returns empty array if docs are not found', async () => {
        getResourcesInner.resolves([]);

        const result = await TargetInterval.v1.getPage(remoteContext)(qualifier, cursor, limit);

        expect(result).to.deep.equal([]);
        expect(getResourcesOuter.calledOnceWithExactly(remoteContext, 'api/v1/target-interval')).to.be.true;
        expect(getResourcesInner.calledOnceWithExactly(queryParam)).to.be.true;
      });
    });
  });
});
