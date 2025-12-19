import { DataContext, InvalidArgumentError } from '../src';
import sinon, { SinonStub } from 'sinon';
import * as Context from '../src/libs/data-context';
import * as Qualifier from '../src/qualifier';
import * as TargetInterval from '../src/target-interval';
import { expect } from 'chai';
import * as Local from '../src/local';
import * as Remote from '../src/remote';
import { and } from '../src/qualifier';
import * as Core from '../src/libs/core';

describe('target-interval', () => {
  const dataContext = { } as DataContext;
  let assertDataContext: SinonStub;
  let adapt: SinonStub;

  beforeEach(() => {
    assertDataContext = sinon.stub(Context, 'assertDataContext');
    adapt = sinon.stub(Context, 'adapt');
  });

  afterEach(() => sinon.restore());

  describe('v1', () => {
    describe('get', () => {
      const targetInterval = {
        user: 'user',
        owner: 'owner',
        reporting_period: '2025-01',
        updated_date: 123,
        targets: [
          { id: 'target1', value: { pass: 5, total: 6 } },
          { id: 'target2', value: { pass: 8, total: 10, percent: 80 } },
        ]
      } as TargetInterval.v1.TargetInterval;

      let getTargetInterval: SinonStub;

      beforeEach(() => {
        getTargetInterval = sinon.stub();
        adapt.returns(getTargetInterval);
      });

      it('retrieves the target interval when qualifier is UUID', async () => {
        const qualifier = Qualifier.byUuid('uuid');
        getTargetInterval.resolves(targetInterval);

        const result = await TargetInterval.v1.get(dataContext)(qualifier);

        expect(result).to.equal(targetInterval);
        expect(assertDataContext).to.have.been.calledOnceWithExactly(dataContext);
        expect(adapt).to.have.been.calledOnceWithExactly(
          dataContext, Local.TargetInterval.v1.get, Remote.TargetInterval.v1.get
        );
        expect(getTargetInterval).to.have.been.calledOnceWithExactly(qualifier);
      });

      it('builds UUID from composite qualifier and retrieves target interval', async () => {
        const composite = Qualifier.and(
          Qualifier.byReportingPeriod('2025-01'),
          Qualifier.byContactUuid('contact-uuid'),
          Qualifier.byUsername('someuser')
        );
        const expectedUuidQualifier = Qualifier.byUuid(
          `target~${composite.reportingPeriod}~${composite.contactUuid}~org.couchdb.user:${composite.username}`
        );

        getTargetInterval.resolves(targetInterval);

        const result = await TargetInterval.v1.get(dataContext)(composite);

        expect(result).to.equal(targetInterval);
        expect(assertDataContext).to.have.been.calledOnceWithExactly(dataContext);
        expect(adapt).to.have.been.calledOnceWithExactly(
          dataContext, Local.TargetInterval.v1.get, Remote.TargetInterval.v1.get
        );
        expect(getTargetInterval).to.have.been.calledOnceWithExactly(expectedUuidQualifier);
      });

      it('throws an error if the data context is invalid', () => {
        assertDataContext.throws(new Error('Invalid data context [null].'));

        expect(() => TargetInterval.v1.get(dataContext)).to.throw('Invalid data context [null].');

        expect(assertDataContext).to.have.been.calledOnceWithExactly(dataContext);
        expect(adapt).to.not.have.been.called;
        expect(getTargetInterval).to.not.have.been.called;
      });

      [
        Qualifier.and(
          Qualifier.byContactUuid('contact-uuid'),
          Qualifier.byUsername('someuser')
        ),
        Qualifier.and(
          Qualifier.byReportingPeriod('2025-01'),
          Qualifier.byUsername('someuser')
        ),
        Qualifier.and(
          Qualifier.byReportingPeriod('2025-01'),
          Qualifier.byContactUuid('contact-uuid'),
        ),
        Qualifier.byReportingPeriod('2025-01'),
        Qualifier.byContactUuid('contact-uuid'),
        Qualifier.byUsername('someuser')
      ].forEach(qualifier => {
        it('throws an error when an invalid qualifier is provided', async () => {
          const getTarget = TargetInterval.v1.get(dataContext);
          await expect(getTarget(qualifier as unknown as Qualifier.UuidQualifier)).to.be.rejectedWith(
            `Invalid target interval qualifier [${JSON.stringify(qualifier)}].`
          );

          expect(assertDataContext).to.have.been.calledOnceWithExactly(dataContext);
          expect(adapt).to.have.been.calledOnceWithExactly(
            dataContext, Local.TargetInterval.v1.get, Remote.TargetInterval.v1.get
          );
          expect(getTargetInterval).to.not.have.been.called;
        });
      });
    });

    describe('getPage', () => {
      const targetIntervals = [
        {
          user: 'user',
          owner: 'owner1-uuid',
          reporting_period: '2025-01',
          updated_date: 123,
          targets: [
            { id: 'target1', value: { pass: 5, total: 6 } },
            { id: 'target2', value: { pass: 8, total: 10, percent: 80 } },
          ]
        },
        {
          user: 'user',
          owner: 'owner2-uuid',
          reporting_period: '2025-01',
          updated_date: 123,
          targets: [
            { id: 'target1', value: { pass: 5, total: 6 } },
            { id: 'target2', value: { pass: 8, total: 10, percent: 80 } },
          ]
        }
      ] as TargetInterval.v1.TargetInterval[];

      let getPage: SinonStub;

      beforeEach(() => {
        getPage = sinon.stub();
        adapt.returns(getPage);
      });

      [
        Qualifier.byContactUuids(['owner1-uuid', 'owner2-uuid']),
        Qualifier.byContactUuid('owner1-uuid')
      ].forEach(contactQualifier => {
        it('retrieves the target interval with the correct parameters', async () => {
          const qualifier = Qualifier.and(
            contactQualifier,
            Qualifier.byReportingPeriod('2025-01')
          );
          getPage.resolves(targetIntervals);

          const result = await TargetInterval.v1.getPage(dataContext)(qualifier);

          expect(result).to.equal(targetIntervals);
          expect(assertDataContext).to.have.been.calledOnceWithExactly(dataContext);
          expect(adapt).to.have.been.calledOnceWithExactly(
            dataContext, Local.TargetInterval.v1.getPage, Remote.TargetInterval.v1.getPage
          );
          expect(getPage).to.have.been.calledOnceWith(qualifier);
        });
      });

      it('throws an error if the data context is invalid', () => {
        const errorMsg = 'Invalid data context [null].';
        assertDataContext.throws(new Error(errorMsg));

        expect(() => TargetInterval.v1.getPage(dataContext)).to.throw(errorMsg);

        expect(assertDataContext).to.have.been.calledOnceWithExactly(dataContext);
        expect(adapt).to.not.have.been.called;
        expect(getPage).to.not.have.been.called;
      });

      ([
        Qualifier.byContactUuid('owner1-uuid'),
        Qualifier.byContactUuids(['owner1-uuid', 'owner2-uuid']),
        Qualifier.byReportingPeriod('2025-01'),
        and(
          Qualifier.byContactUuid('owner1-uuid'),
          Qualifier.byContactUuids(['owner1-uuid', 'owner2-uuid']),
          Qualifier.byReportingPeriod('2025-01')
        )
      ] as unknown as (
        Qualifier.ReportingPeriodQualifier & Qualifier.ContactUuidsQualifier
      )[]).forEach(invalidQualifier => {
        it('throws an error if the qualifier is invalid', async () => {
          await expect(TargetInterval.v1.getPage(dataContext)(invalidQualifier, null, 10))
            .to.be.rejectedWith(`Invalid target intervals qualifier [${JSON.stringify(invalidQualifier)}].`);

          expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
          expect(
            adapt.calledOnceWithExactly(
              dataContext,
              Local.TargetInterval.v1.getPage,
              Remote.TargetInterval.v1.getPage
            )
          ).to.be.true;
          expect(getPage.notCalled).to.be.true;
        });
      });

      [
        -1,
        null,
        '',
        0,
        false,
        {},
        3.45
      ].forEach(l => {
        it('throws an error when an invalid limit is provided', async () => {
          const getTarget = TargetInterval.v1.getPage(dataContext);
          
          await expect(
            getTarget(
              Qualifier.and(
                Qualifier.byContactUuids(['owner1-uuid', 'owner2-uuid']), 
                Qualifier.byReportingPeriod('2025-01')
              ), 
              '1', 
              l as number
            )
          ).to.be.rejectedWith(InvalidArgumentError);

          expect(assertDataContext).to.have.been.calledOnceWithExactly(dataContext);
          expect(adapt).to.have.been.calledOnceWithExactly(
            dataContext, Local.TargetInterval.v1.getPage, Remote.TargetInterval.v1.getPage
          );
          expect(getPage).to.not.have.been.called;
        });
      });

      [
        {},
        '',
        1,
        false,
      ].forEach(c => {
        it('throws an error when an invalid cursor is provided', async () => {
          const getTarget = TargetInterval.v1.getPage(dataContext);
          
          await expect(
            getTarget(
              Qualifier.and(
                Qualifier.byContactUuids(['owner1-uuid', 'owner2-uuid']), 
                Qualifier.byReportingPeriod('2025-01')
              ), 
              c as unknown as string, 
              10
            )
          ).to.be.rejectedWith(InvalidArgumentError);

          expect(assertDataContext).to.have.been.calledOnceWithExactly(dataContext);
          expect(adapt).to.have.been.calledOnceWithExactly(
            dataContext, Local.TargetInterval.v1.getPage, Remote.TargetInterval.v1.getPage
          );
          expect(getPage).to.not.have.been.called;
        });
      });
    });

    describe('getAll', () => {
      const targetIntervals = [
        {
          user: 'user',
          owner: 'owner1-uuid',
          reporting_period: '2025-01',
          updated_date: 123,
          targets: [
            { id: 'target1', value: { pass: 5, total: 6 } },
            { id: 'target2', value: { pass: 8, total: 10, percent: 80 } },
          ]
        },
        {
          user: 'user',
          owner: 'owner2-uuid',
          reporting_period: '2025-01',
          updated_date: 123,
          targets: [
            { id: 'target1', value: { pass: 5, total: 6 } },
            { id: 'target2', value: { pass: 8, total: 10, percent: 80 } },
          ]
        }
      ] as TargetInterval.v1.TargetInterval[];
      const mockGenerator = async function* () {
        for (const target of targetIntervals) {
          yield target;
        }
      };

      let getPage: SinonStub;
      let getPagedGenerator: SinonStub;

      beforeEach(() => {
        getPage = sinon.stub(TargetInterval.v1, 'getPage');
        dataContext.bind = sinon.stub().returns(getPage);
        getPagedGenerator = sinon.stub(Core, 'getPagedGenerator');
      });

      [
        Qualifier.byContactUuids(['owner1-uuid', 'owner2-uuid']),
        Qualifier.byContactUuid('owner1-uuid')
      ].forEach(contactQualifier => {
        it('returns target interval generator with correct parameters', () => {
          const qualifier = Qualifier.and(
            contactQualifier,
            Qualifier.byReportingPeriod('2025-01')
          );
          getPagedGenerator.returns(mockGenerator);

          const generator = TargetInterval.v1.getAll(dataContext)(qualifier);

          expect(generator).to.deep.equal(mockGenerator);
          expect(assertDataContext).to.have.been.calledOnceWithExactly(dataContext);
          expect(adapt).to.not.have.been.called;
          expect(getPagedGenerator).to.have.been.calledOnceWithExactly(getPage, qualifier);
        });
      });

      it('throws an error if the data context is invalid', () => {
        const errorMsg = 'Invalid data context [null].';
        assertDataContext.throws(new Error(errorMsg));

        expect(() => TargetInterval.v1.getAll(dataContext)).to.throw(errorMsg);

        expect(assertDataContext).to.have.been.calledOnceWithExactly(dataContext);
        expect(adapt).to.not.have.been.called;
        expect(getPagedGenerator).to.not.have.been.called;
      });

      ([
        Qualifier.byContactUuid('owner1-uuid'),
        Qualifier.byContactUuids(['owner1-uuid', 'owner2-uuid']),
        Qualifier.byReportingPeriod('2025-01'),
        and(
          Qualifier.byContactUuid('owner1-uuid'),
          Qualifier.byContactUuids(['owner1-uuid', 'owner2-uuid']),
          Qualifier.byReportingPeriod('2025-01')
        )
      ] as unknown as (
        Qualifier.ReportingPeriodQualifier & Qualifier.ContactUuidsQualifier
      )[]).forEach(invalidQualifier => {
        it('throws an error if the qualifier is invalid', () => {
          const getAll = TargetInterval.v1.getAll(dataContext);

          expect(() => getAll(invalidQualifier)).to.throw(
            `Invalid target intervals qualifier [${JSON.stringify(invalidQualifier)}].`
          );

          expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
          expect(adapt).to.not.have.been.called;
          expect(getPagedGenerator.notCalled).to.be.true;
        });
      });
    });
  });
});
