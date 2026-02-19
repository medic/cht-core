import sinon, { SinonStub } from 'sinon';
import logger from '@medic/logger';
import { expect } from 'chai';
import { Doc } from '../../src/libs/doc';
import * as LocalDoc from '../../src/local/libs/doc';
import * as Target from '../../src/local/target';
import { LocalDataContext } from '../../src/local/libs/data-context';
import { and, byReportingPeriod, byContactUuid, byContactUuids } from '../../src/qualifier';

describe('local target', () => {
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

      it('returns a target by UUID', async () => {
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

        const result = await Target.v1.get(localContext)(identifier);

        expect(result).to.equal(doc);
        expect(getDocByIdOuter).to.have.been.calledOnceWithExactly(localContext.medicDb);
        expect(getDocByIdInner).to.have.been.calledOnceWithExactly(identifier.uuid);
        expect(warn).to.not.have.been.called;
      });

      it('returns null if the identified doc is not found', async () => {
        getDocByIdInner.resolves(null);

        const result = await Target.v1.get(localContext)(identifier);

        expect(result).to.be.null;
        expect(getDocByIdOuter).to.have.been.calledOnceWithExactly(localContext.medicDb);
        expect(getDocByIdInner).to.have.been.calledOnceWithExactly(identifier.uuid);
        expect(warn).to.have.been.calledOnceWithExactly(
          `Document [${identifier.uuid}] is not a valid target.`
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
        it('returns null if the identified doc is not a target', async () => {
          getDocByIdInner.resolves(invalidDoc);

          const result = await Target.v1.get(localContext)(identifier);

          expect(result).to.be.null;
          expect(getDocByIdOuter).to.have.been.calledOnceWithExactly(localContext.medicDb);
          expect(getDocByIdInner).to.have.been.calledOnceWithExactly(identifier.uuid);
          expect(warn).to.have.been.calledOnceWithExactly(
            `Document [${identifier.uuid}] is not a valid target.`
          );
        });
      });
    });

    describe('getPage', () => {
      const target0 = {
        _id: 'target~2025-01~contact-1',
        user: 'user1',
        owner: 'contact-1',
        reporting_period: '2025-01',
        updated_date: 123,
        targets: []
      };
      const target1 = {
        _id: 'target~2025-01~contact-2',
        user: 'user2',
        owner: 'contact-2',
        reporting_period: '2025-01',
        updated_date: 124,
        targets: []
      };
      const target2 = {
        _id: 'target~2025-01~contact-2',
        user: 'user2',
        owner: 'contact-2',
        reporting_period: '2025-01',
        updated_date: 124,
        targets: []
      };
      const invalidTarget = {
        _id: 'target~2025-01~contact-2'
      };
      const qualifier = and(
        byReportingPeriod('2025-01'),
        byContactUuids([
          target0.owner,
          target1.owner,
          target2.owner
        ])
      );
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

      it('returns paginated targets for valid qualifier with matching contactUuids', async () => {
        getDocUuidsByIdRangeInner.resolves([
          target0._id,
          target1._id,
          target2._id,
          invalidTarget._id,
          'target~2025-01~different-contact-id',
        ]);
        const expectedPage = {
          data: [target0, target1, target2],
          cursor: '3'
        };
        fetchAndFilterInner.resolves(expectedPage);
        getDocsByIdsInner.resolves([target0, target1, target2, invalidTarget]);

        const result = await Target.v1.getPage(localContext)(qualifier, null, 10);

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
        expect(docs).to.deep.equal([target0, target1, target2, invalidTarget]);
        expect(getDocsByIdsInner).to.have.been.calledOnceWithExactly([
          target0._id,
          target1._id,
          target2._id,
          invalidTarget._id
        ]);
        // Assert ids are filtered by skip/limit
        await getFn(2, 0);
        expect(getDocsByIdsInner).to.have.been.calledWithExactly([target0._id, target1._id]);
        await getFn(2, 10);
        expect(getDocsByIdsInner).to.have.been.calledWithExactly([]);

        expect(filterFn(target0)).to.be.true;
        expect(filterFn(invalidTarget)).to.be.false;
        expect(filterFn({})).to.be.false;
      });

      [
        byContactUuid(target0.owner),
        byContactUuids([target0.owner])
      ].forEach(contactQualifier => {
        it('returns target for valid qualifier with single contactUuid', async () => {
          getDocUuidsByIdRangeInner.resolves([target0._id]);
          const expectedPage = {
            data: [target0],
            cursor: '3'
          };
          fetchAndFilterInner.resolves(expectedPage);
          getDocsByIdsInner.resolves([target0]);
          const qualifier = and(
            byReportingPeriod('2025-01'),
            contactQualifier
          );

          const result = await Target.v1.getPage(localContext)(qualifier, null, 10);

          expect(result).to.equal(expectedPage);
          expect(getDocUuidsByIdRangeOuter).to.have.been.calledOnceWithExactly(localContext.medicDb);
          expect(getDocUuidsByIdRangeInner).to.have.been.calledOnceWithExactly(
            `target~${qualifier.reportingPeriod}~${target0.owner}~`,
            `target~${qualifier.reportingPeriod}~${target0.owner}~\ufff0`
          );
          expect(getDocsByIdsOuter).to.have.been.calledOnceWithExactly(localContext.medicDb);
          expect(fetchAndFilterOuter).to.have.been.calledOnce;
          expect(fetchAndFilterInner).to.have.been.calledOnceWithExactly(10, 0);
        });
      });

      [
        [],
        ['target~2025-01~different-contact-id',]
      ].forEach(targetIds => {
        it('returns empty page when no targets are found for the reporting period and contacts', async () => {
          getDocUuidsByIdRangeInner.resolves(targetIds);

          const result = await Target.v1.getPage(localContext)(qualifier, null, 10);

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
        const getPage = Target.v1.getPage(localContext);

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
