import { DataContext } from '../src';
import sinon, { SinonStub } from 'sinon';
import * as Context from '../src/libs/data-context';
import * as Qualifier from '../src/qualifier';
import * as TargetInterval from '../src/target-interval';
import { expect } from 'chai';
import * as Local from '../src/local';
import * as Remote from '../src/remote';
import { and, byContactUuid, byReportingPeriod, byUsername, UuidQualifier } from '../src/qualifier';

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
        const composite = and(
          byReportingPeriod('2025-01'),
          byContactUuid('contact-uuid'),
          byUsername('someuser')
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
        and(
          byContactUuid('contact-uuid'),
          byUsername('someuser')
        ),
        and(
          byReportingPeriod('2025-01'),
          byUsername('someuser')
        ),
        and(
          byReportingPeriod('2025-01'),
          byContactUuid('contact-uuid'),
        ),
        byReportingPeriod('2025-01'),
        byContactUuid('contact-uuid'),
        byUsername('someuser')
      ].forEach(qualifier => {
        it('throws an error when an invalid qualifier is provided', async () => {
          const getTarget = TargetInterval.v1.get(dataContext);
          await expect(getTarget(qualifier as unknown as UuidQualifier)).to.be.rejectedWith(
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
      const targetInterval = [
        {
          user: 'user',
          owner: 'owner',
          reporting_period: '2025-01',
          updated_date: 123,
          targets: [
            { id: 'target1', value: { pass: 5, total: 6 } },
            { id: 'target2', value: { pass: 8, total: 10, percent: 80 } },
          ]
        },
        {
          user: 'user',
          owner: 'owner',
          reporting_period: '2025-01',
          updated_date: 123,
          targets: [
            { id: 'target1', value: { pass: 5, total: 6 } },
            { id: 'target2', value: { pass: 8, total: 10, percent: 80 } },
          ]
        }
      ] as TargetInterval.v1.TargetInterval[];

      let getTargetInterval: SinonStub;

      beforeEach(() => {
        getTargetInterval = sinon.stub();
        adapt.returns(getTargetInterval);
      });

      it('retrieves the target interval when qualifier is UUID', async () => {
        const qualifier = Qualifier.byUuid('uuid');
        getTargetInterval.resolves(targetInterval);

        const result = await TargetInterval.v1.getPage(dataContext)(qualifier);

        expect(result).to.equal(targetInterval);
        expect(assertDataContext).to.have.been.calledOnceWithExactly(dataContext);
        expect(adapt).to.have.been.calledOnceWithExactly(
          dataContext, Local.TargetInterval.v1.getPage, Remote.TargetInterval.v1.getPage
        );
        expect(getTargetInterval).to.have.been.calledOnceWithExactly(qualifier);
      });

      it('builds UUID from composite qualifier and retrieves target interval', async () => {
        const composite = and(
          byReportingPeriod('2025-01'),
          byContactUuid('contact-uuid'),
          byUsername('someuser')
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
        and(
          byContactUuid('contact-uuid'),
          byUsername('someuser')
        ),
        and(
          byReportingPeriod('2025-01'),
          byUsername('someuser')
        ),
        and(
          byReportingPeriod('2025-01'),
          byContactUuid('contact-uuid'),
        ),
        byReportingPeriod('2025-01'),
        byContactUuid('contact-uuid'),
        byUsername('someuser')
      ].forEach(qualifier => {
        it('throws an error when an invalid qualifier is provided', async () => {
          const getTarget = TargetInterval.v1.get(dataContext);
          await expect(getTarget(qualifier as unknown as UuidQualifier)).to.be.rejectedWith(
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
  });
});
