import sinon, { SinonStub } from 'sinon';
import logger from '@medic/logger';
import { expect } from 'chai';
import { Doc } from '../../src/libs/doc';
import * as LocalDoc from '../../src/local/libs/doc';
import * as TargetInterval from '../../src/local/target-interval';
import { LocalDataContext } from '../../src/local/libs/data-context';

describe('local target interval', () => {
  let localContext: LocalDataContext;
  let warn: SinonStub;

  beforeEach(() => {
    localContext = {
      medicDb: {} as PouchDB.Database<Doc>,
    } as unknown as LocalDataContext;
    warn = sinon.stub(logger, 'warn');
  });

  afterEach(() => sinon.restore());

  describe('v1', () => {
    describe('get', () => {
      const identifier = { uuid: 'uuid' } as const;
      let getDocByIdOuter: SinonStub;
      let getDocByIdInner: SinonStub;

      beforeEach(() => {
        getDocByIdInner = sinon.stub();
        getDocByIdOuter = sinon.stub(LocalDoc, 'getDocById').returns(getDocByIdInner);
      });

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
        getDocByIdInner.resolves(doc);

        const result = await TargetInterval.v1.get(localContext)(identifier);

        expect(result).to.equal(doc);
        expect(getDocByIdOuter).to.have.been.calledOnceWithExactly(localContext.medicDb);
        expect(getDocByIdInner).to.have.been.calledOnceWithExactly(identifier.uuid);
        expect(warn).to.not.have.been.called;
      });

      it('returns null if the identified doc is not found', async () => {
        getDocByIdInner.resolves(null);

        const result = await TargetInterval.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter).to.have.been.calledOnceWithExactly(localContext.medicDb);
        expect(getDocByIdInner).to.have.been.calledOnceWithExactly(identifier.uuid);
        expect(warn).to.have.been.calledOnceWithExactly(
          `Document [${identifier.uuid}] is not a valid target interval.`
        );
      });

      [
        {},
        { foo: 'bar' },
        {
          user: 'user',
          owner: 'owner',
          reporting_period: '2025-01',
          updated_date: 123,
        },
        {
          user: 'user',
          owner: 'owner',
          reporting_period: '2025-01',
          targets: []
        },
        {
          user: 'user',
          owner: 'owner',
          updated_date: 123,
          targets: []
        },
        {
          user: 'user',
          reporting_period: '2025-01',
          updated_date: 123,
          targets: []
        },
        {
          owner: 'owner',
          reporting_period: '2025-01',
          updated_date: 123,
          targets: []
        },
      ].forEach(invalidDoc => {
        it('returns null if the identified doc is not a target interval', async () => {
          getDocByIdInner.resolves(invalidDoc);

          const result = await TargetInterval.v1.get(localContext)(identifier);

          expect(result).to.be.null;
          expect(getDocByIdOuter).to.have.been.calledOnceWithExactly(localContext.medicDb);
          expect(getDocByIdInner).to.have.been.calledOnceWithExactly(identifier.uuid);
          expect(warn).to.have.been.calledOnceWithExactly(
            `Document [${identifier.uuid}] is not a valid target interval.`
          );
        });
      });
    });

    describe('getPage', () => {
      const targetInterval0 = {
        _id: 'target~2025-01~contact-1',
        user: 'user1',
        owner: 'contact-1',
        reporting_period: '2025-01',
        updated_date: 123,
        targets: []
      };
      const targetInterval1 = {
        _id: 'target~2025-01~contact-2',
        user: 'user2',
        owner: 'contact-2',
        reporting_period: '2025-01',
        updated_date: 124,
        targets: []
      };
      const targetInterval2 = {
        _id: 'target~2025-01~contact-2',
        user: 'user2',
        owner: 'contact-2',
        reporting_period: '2025-01',
        updated_date: 124,
        targets: []
      };
      const invalidTargetInterval = {
        _id: 'target~2025-01~contact-2'
      };
      const qualifier = {
        reportingPeriod: '2025-01',
        contactUuids: [
          targetInterval0.owner,
          targetInterval1.owner,
          targetInterval2.owner
        ] as [string, ...string[]]
      };
      let getDocUuidsByIdRangeOuter: SinonStub;
      let getDocUuidsByIdRangeInner: SinonStub;
      let getDocsByIdsOuter: SinonStub;
      let getDocsByIdsInner: SinonStub;
      let fetchAndFilterOuter: SinonStub;
      let fetchAndFilterInner: SinonStub;

      beforeEach(() => {
        getDocUuidsByIdRangeInner = sinon.stub();
        getDocUuidsByIdRangeOuter = sinon
          .stub(LocalDoc, 'getDocUuidsByIdRange')
          .returns(getDocUuidsByIdRangeInner);

        getDocsByIdsInner = sinon.stub();
        getDocsByIdsOuter = sinon.stub(LocalDoc, 'getDocsByIds').returns(getDocsByIdsInner);

        fetchAndFilterInner = sinon.stub();
        fetchAndFilterOuter = sinon.stub(LocalDoc, 'fetchAndFilter').returns(fetchAndFilterInner);
      });

      it('returns paginated target intervals for valid qualifier with matching contactUuids', async () => {
        getDocUuidsByIdRangeInner.resolves([
          targetInterval0._id,
          targetInterval1._id,
          targetInterval2._id,
          invalidTargetInterval._id,
          'target~2025-01~different-contact-id',
        ]);
        const expectedPage = {
          data: [targetInterval0, targetInterval1, targetInterval2],
          cursor: '3'
        };
        fetchAndFilterInner.resolves(expectedPage);
        getDocsByIdsInner.resolves([targetInterval0, targetInterval1, targetInterval2, invalidTargetInterval]);

        const result = await TargetInterval.v1.getPage(localContext)(qualifier, null, 10);

        expect(result).to.equal(expectedPage);
        expect(getDocUuidsByIdRangeOuter).to.have.been.calledOnceWithExactly(localContext.medicDb);
        expect(getDocUuidsByIdRangeInner).to.have.been.calledOnceWithExactly(
          `target~${qualifier.reportingPeriod}~`,
          `target~${qualifier.reportingPeriod}~\ufff0`
        );
        expect(getDocsByIdsOuter).to.have.been.calledOnceWithExactly(localContext.medicDb);
        expect(fetchAndFilterOuter).to.have.been.calledOnce;
        expect(fetchAndFilterInner).to.have.been.calledOnceWithExactly(10, 0);

        const [getFn, filterFn, limit] = fetchAndFilterOuter.getCall(0).args;
        expect(limit).to.equal(10);

        const docs = await getFn(10, 0);
        expect(docs).to.deep.equal([targetInterval0, targetInterval1, targetInterval2, invalidTargetInterval]);
        expect(getDocsByIdsInner).to.have.been.calledOnceWithExactly([
          targetInterval0._id,
          targetInterval1._id,
          targetInterval2._id,
          invalidTargetInterval._id
        ]);
        // Assert ids are filtered by skip/limit
        await getFn(2, 0);
        expect(getDocsByIdsInner).to.have.been.calledWithExactly([targetInterval0._id, targetInterval1._id]);
        await getFn(2, 10);
        expect(getDocsByIdsInner).to.have.been.calledWithExactly([]);

        expect(filterFn(targetInterval0)).to.be.true;
        expect(filterFn(invalidTargetInterval)).to.be.false;
        expect(filterFn({})).to.be.false;
      });

      [
        [],
        ['target~2025-01~different-contact-id',]
      ].forEach(targetIntervalIds => {
        it('returns empty page when no target intervals are found for the reporting period and contacts', async () => {
          getDocUuidsByIdRangeInner.resolves(targetIntervalIds);

          const result = await TargetInterval.v1.getPage(localContext)(qualifier, null, 10);

          expect(result).to.deep.equal({
            data: [],
            cursor: null
          });
          expect(getDocUuidsByIdRangeOuter).to.have.been.calledOnceWithExactly(localContext.medicDb);
          expect(getDocUuidsByIdRangeInner).to.have.been.calledOnceWithExactly(
            `target~${qualifier.reportingPeriod}~`,
            `target~${qualifier.reportingPeriod}~\ufff0`
          );
          expect(getDocsByIdsOuter).to.have.been.calledOnceWithExactly(localContext.medicDb);
          expect(fetchAndFilterOuter).to.not.have.been.called;
          expect(fetchAndFilterInner).to.not.have.been.called;
        });
      });

      it('throws error when invalid cursor provided', async () => {
        const cursor = { cursor: 'cursor' } as unknown as string;
        const getPage = TargetInterval.v1.getPage(localContext);

        expect(getDocUuidsByIdRangeOuter).to.have.been.calledOnceWithExactly(localContext.medicDb);
        expect(getDocsByIdsOuter).to.have.been.calledOnceWithExactly(localContext.medicDb);

        await expect(getPage(qualifier, cursor, 10)).to.be.rejectedWith(
          `The cursor must be a string or null for first page: [${JSON.stringify(cursor)}].`
        );

        expect(getDocUuidsByIdRangeInner).to.not.have.been.called;
        expect(fetchAndFilterOuter).to.not.have.been.called;
        expect(fetchAndFilterInner).to.not.have.been.called;
      });
    });
  });
});
