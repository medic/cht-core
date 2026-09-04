import { DataContext, InvalidArgumentError } from '../src';
import sinon, { SinonStub } from 'sinon';
import * as Context from '../src/libs/data-context';
import * as Qualifier from '../src/qualifier';
import * as Target from '../src/target';
import { expect } from 'chai';
import * as Local from '../src/local';
import * as Remote from '../src/remote';
import { and } from '../src/qualifier';
import * as Core from '../src/libs/core';
import { fakeGenerator } from './utils';
const { PREFIXES } = require('@medic/constants');

describe('target', () => {
  const dataContext = { bind: () => null } as DataContext;
  let dataContextBind: SinonStub;
  let assertDataContext: SinonStub;
  let adapt: SinonStub;

  beforeEach(() => {
    dataContextBind = sinon.stub(dataContext, 'bind');
    assertDataContext = sinon.stub(Context, 'assertDataContext');
    adapt = sinon.stub(Context, 'adapt');
  });

  afterEach(() => sinon.restore());

  describe('v1', () => {
    describe('get', () => {
      const target = {
        user: 'user',
        owner: 'owner',
        reporting_period: '2025-01',
        updated_date: 123,
        targets: [
          { id: 'target1', value: { pass: 5, total: 6 } },
          { id: 'target2', value: { pass: 8, total: 10, percent: 80 } },
        ]
      } as Target.v1.Target;

      let getTarget: SinonStub;

      beforeEach(() => {
        getTarget = sinon.stub();
        adapt.returns(getTarget);
      });

      it('retrieves the target when qualifier is Id', async () => {
        const qualifier = Qualifier.byId('uuid');
        getTarget.resolves(target);

        const result = await Target.v1.get(dataContext)(qualifier);

        expect(result).to.equal(target);
        expect(assertDataContext).to.have.been.calledOnceWithExactly(dataContext);
        expect(adapt).to.have.been.calledOnceWithExactly(
          dataContext, Local.Target.v1.get, Remote.Target.v1.get
        );
        expect(getTarget).to.have.been.calledOnceWithExactly(qualifier);
      });

      it('builds Id from composite qualifier and retrieves target', async () => {
        const composite = Qualifier.and(
          Qualifier.byReportingPeriod('2025-01'),
          Qualifier.byContactId('contact-uuid'),
          Qualifier.byUsername('someuser')
        );
        const expectedIdQualifier = Qualifier.byId(
          `target~${composite.reportingPeriod}~${composite.contactId}~${PREFIXES.COUCH_USER}${composite.username}`
        );

        getTarget.resolves(target);

        const result = await Target.v1.get(dataContext)(composite);

        expect(result).to.equal(target);
        expect(assertDataContext).to.have.been.calledOnceWithExactly(dataContext);
        expect(adapt).to.have.been.calledOnceWithExactly(
          dataContext, Local.Target.v1.get, Remote.Target.v1.get
        );
        expect(getTarget).to.have.been.calledOnceWithExactly(expectedIdQualifier);
      });

      it('throws an error if the data context is invalid', () => {
        assertDataContext.throws(new Error('Invalid data context [null].'));

        expect(() => Target.v1.get(dataContext)).to.throw('Invalid data context [null].');

        expect(assertDataContext).to.have.been.calledOnceWithExactly(dataContext);
        expect(adapt).to.not.have.been.called;
        expect(getTarget).to.not.have.been.called;
      });

      [
        Qualifier.and(
          Qualifier.byContactId('contact-uuid'),
          Qualifier.byUsername('someuser')
        ),
        Qualifier.and(
          Qualifier.byReportingPeriod('2025-01'),
          Qualifier.byUsername('someuser')
        ),
        Qualifier.and(
          Qualifier.byReportingPeriod('2025-01'),
          Qualifier.byContactId('contact-uuid'),
        ),
        Qualifier.byReportingPeriod('2025-01'),
        Qualifier.byContactId('contact-uuid'),
        Qualifier.byUsername('someuser')
      ].forEach(qualifier => {
        it('throws an error when an invalid qualifier is provided', async () => {
          const getTargetFn = Target.v1.get(dataContext);
          await expect(getTargetFn(qualifier as unknown as Qualifier.IdQualifier)).to.be.rejectedWith(
            `Invalid target qualifier [${JSON.stringify(qualifier)}].`
          );

          expect(assertDataContext).to.have.been.calledOnceWithExactly(dataContext);
          expect(adapt).to.have.been.calledOnceWithExactly(
            dataContext, Local.Target.v1.get, Remote.Target.v1.get
          );
          expect(getTarget).to.not.have.been.called;
        });
      });
    });

    describe('getPage', () => {
      const targets = [
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
      ] as Target.v1.Target[];

      let getPage: SinonStub;

      beforeEach(() => {
        getPage = sinon.stub();
        adapt.returns(getPage);
      });

      [
        Qualifier.byContactIds(['owner1-uuid', 'owner2-uuid']),
        Qualifier.byContactId('owner1-uuid')
      ].forEach(contactQualifier => {
        it('retrieves the target with the correct parameters', async () => {
          const qualifier = Qualifier.and(
            contactQualifier,
            Qualifier.byReportingPeriod('2025-01')
          );
          getPage.resolves(targets);

          const result = await Target.v1.getPage(dataContext)(qualifier);

          expect(result).to.equal(targets);
          expect(assertDataContext).to.have.been.calledOnceWithExactly(dataContext);
          expect(adapt).to.have.been.calledOnceWithExactly(
            dataContext, Local.Target.v1.getPage, Remote.Target.v1.getPage
          );
          expect(getPage).to.have.been.calledOnceWith(qualifier);
        });
      });

      it('throws an error if the data context is invalid', () => {
        const errorMsg = 'Invalid data context [null].';
        assertDataContext.throws(new Error(errorMsg));

        expect(() => Target.v1.getPage(dataContext)).to.throw(errorMsg);

        expect(assertDataContext).to.have.been.calledOnceWithExactly(dataContext);
        expect(adapt).to.not.have.been.called;
        expect(getPage).to.not.have.been.called;
      });

      ([
        Qualifier.byContactId('owner1-uuid'),
        Qualifier.byContactIds(['owner1-uuid', 'owner2-uuid']),
        Qualifier.byReportingPeriod('2025-01'),
        and(
          Qualifier.byContactId('owner1-uuid'),
          Qualifier.byContactIds(['owner1-uuid', 'owner2-uuid']),
          Qualifier.byReportingPeriod('2025-01')
        )
      ] as unknown as (
        Qualifier.ReportingPeriodQualifier & Qualifier.ContactIdsQualifier
      )[]).forEach(invalidQualifier => {
        it('throws an error if the qualifier is invalid', async () => {
          await expect(Target.v1.getPage(dataContext)(invalidQualifier, null, 10))
            .to.be.rejectedWith(`Invalid targets qualifier [${JSON.stringify(invalidQualifier)}].`);

          expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
          expect(
            adapt.calledOnceWithExactly(
              dataContext,
              Local.Target.v1.getPage,
              Remote.Target.v1.getPage
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
          const getTarget = Target.v1.getPage(dataContext);
          
          await expect(
            getTarget(
              Qualifier.and(
                Qualifier.byContactIds(['owner1-uuid', 'owner2-uuid']),
                Qualifier.byReportingPeriod('2025-01')
              ), 
              '1', 
              l as number
            )
          ).to.be.rejectedWith(InvalidArgumentError);

          expect(assertDataContext).to.have.been.calledOnceWithExactly(dataContext);
          expect(adapt).to.have.been.calledOnceWithExactly(
            dataContext, Local.Target.v1.getPage, Remote.Target.v1.getPage
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
          const getTarget = Target.v1.getPage(dataContext);
          
          await expect(
            getTarget(
              Qualifier.and(
                Qualifier.byContactIds(['owner1-uuid', 'owner2-uuid']),
                Qualifier.byReportingPeriod('2025-01')
              ), 
              c as unknown as string, 
              10
            )
          ).to.be.rejectedWith(InvalidArgumentError);

          expect(assertDataContext).to.have.been.calledOnceWithExactly(dataContext);
          expect(adapt).to.have.been.calledOnceWithExactly(
            dataContext, Local.Target.v1.getPage, Remote.Target.v1.getPage
          );
          expect(getPage).to.not.have.been.called;
        });
      });
    });

    describe('getAll', () => {
      const targets = [
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
      ] as Target.v1.Target[];
      const mockGenerator = fakeGenerator(targets);

      let getPage: SinonStub;
      let getPagedGenerator: SinonStub;

      beforeEach(() => {
        getPage = sinon.stub(Target.v1, 'getPage');
        dataContext.bind = sinon.stub().returns(getPage);
        getPagedGenerator = sinon.stub(Core, 'getPagedGenerator');
      });

      [
        Qualifier.byContactIds(['owner1-uuid', 'owner2-uuid']),
        Qualifier.byContactId('owner1-uuid')
      ].forEach(contactQualifier => {
        it('returns target generator with correct parameters', () => {
          const qualifier = Qualifier.and(
            contactQualifier,
            Qualifier.byReportingPeriod('2025-01')
          );
          getPagedGenerator.returns(mockGenerator);

          const generator = Target.v1.getAll(dataContext)(qualifier);

          expect(generator).to.deep.equal(mockGenerator);
          expect(assertDataContext).to.have.been.calledOnceWithExactly(dataContext);
          expect(adapt).to.not.have.been.called;
          expect(getPagedGenerator).to.have.been.calledOnceWithExactly(getPage, qualifier);
        });
      });

      it('throws an error if the data context is invalid', () => {
        const errorMsg = 'Invalid data context [null].';
        assertDataContext.throws(new Error(errorMsg));

        expect(() => Target.v1.getAll(dataContext)).to.throw(errorMsg);

        expect(assertDataContext).to.have.been.calledOnceWithExactly(dataContext);
        expect(adapt).to.not.have.been.called;
        expect(getPagedGenerator).to.not.have.been.called;
      });

      ([
        Qualifier.byContactId('owner1-uuid'),
        Qualifier.byContactIds(['owner1-uuid', 'owner2-uuid']),
        Qualifier.byReportingPeriod('2025-01'),
        and(
          Qualifier.byContactId('owner1-uuid'),
          Qualifier.byContactIds(['owner1-uuid', 'owner2-uuid']),
          Qualifier.byReportingPeriod('2025-01')
        )
      ] as unknown as (
        Qualifier.ReportingPeriodQualifier & Qualifier.ContactIdsQualifier
      )[]).forEach(invalidQualifier => {
        it('throws an error if the qualifier is invalid', () => {
          const getAll = Target.v1.getAll(dataContext);

          expect(() => getAll(invalidQualifier)).to.throw(
            `Invalid targets qualifier [${JSON.stringify(invalidQualifier)}].`
          );

          expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
          expect(adapt).to.not.have.been.called;
          expect(getPagedGenerator.notCalled).to.be.true;
        });
      });
    });

    describe('getDatasource', () => {
      let target: Target.v1.Datasource;

      beforeEach(() => target = Target.v1.getDatasource(dataContext));

      it('contains expected keys', () => {
        expect(target).to.have.all.keys([
          'getById', 'getByReportingPeriodContactIdUsername',
          'getPageByReportingPeriodContactIds', 'getByReportingPeriodContactIds'
        ]);
      });

      it('getById', async () => {
        const expectedTarget = {};
        const reportGet = sinon.stub().resolves(expectedTarget);
        dataContextBind.returns(reportGet);
        const qualifier = Qualifier.byId('my-target-uuid');

        const returnedTarget = await target.getById(qualifier.id);

        expect(returnedTarget).to.equal(expectedTarget);
        expect(dataContextBind.calledOnceWithExactly(Target.v1.get)).to.be.true;
        expect(reportGet.calledOnceWithExactly(qualifier)).to.be.true;
      });

      it('getByReportingPeriodContactIdUsername', async () => {
        const expectedTarget = {};
        const reportGet = sinon.stub().resolves(expectedTarget);
        dataContextBind.returns(reportGet);
        const qualifier = Qualifier.and(
          Qualifier.byReportingPeriod('2020-01' ),
          Qualifier.byContactId('my-contact-uuid'),
          Qualifier.byUsername('my-username')
        );

        const returnedTarget = await target.getByReportingPeriodContactIdUsername(
          qualifier.reportingPeriod,
          qualifier.contactId,
          qualifier.username
        );

        expect(returnedTarget).to.equal(expectedTarget);
        expect(dataContextBind.calledOnceWithExactly(Target.v1.get)).to.be.true;
        expect(reportGet.calledOnceWithExactly(qualifier)).to.be.true;
      });

      it('getPageByReportingPeriodContactIds uses default cursor and limit', async () => {
        const expectedTarget = {};
        const reportGet = sinon.stub().resolves(expectedTarget);
        dataContextBind.returns(reportGet);
        const qualifier = Qualifier.and(
          Qualifier.byReportingPeriod('2020-01'),
          Qualifier.byContactIds(['my-first-contact-uuid', 'my-second-contact-uuid'])
        );

        const returnedTarget = await target.getPageByReportingPeriodContactIds(
          qualifier.reportingPeriod,
          qualifier.contactIds
        );

        expect(returnedTarget).to.equal(expectedTarget);
        expect(reportGet.calledOnceWithExactly(qualifier, null, 100)).to.be.true;
      });

      it('getPageByReportingPeriodContactIds - multiple contact Ids', async () => {
        const expectedTarget = {};
        const reportGet = sinon.stub().resolves(expectedTarget);
        dataContextBind.returns(reportGet);
        const qualifier = Qualifier.and(
          Qualifier.byReportingPeriod('2020-01'),
          Qualifier.byContactIds(['my-first-contact-uuid', 'my-second-contact-uuid'])
        );

        const returnedTarget = await target.getPageByReportingPeriodContactIds(
          qualifier.reportingPeriod,
          qualifier.contactIds,
          '1',
          10
        );

        expect(returnedTarget).to.equal(expectedTarget);
        expect(dataContextBind.calledOnceWithExactly(Target.v1.getPage)).to.be.true;
        expect(reportGet.calledOnceWithExactly(qualifier, '1', 10)).to.be.true;
      });

      it('getPageByReportingPeriodContactIds - since contact Id', async () => {
        const expectedTarget = {};
        const reportGet = sinon.stub().resolves(expectedTarget);
        dataContextBind.returns(reportGet);
        const qualifier = Qualifier.and(
          Qualifier.byReportingPeriod('2020-01'),
          Qualifier.byContactId('my-first-contact-uuid')
        );

        const returnedTarget = await target.getPageByReportingPeriodContactIds(
          qualifier.reportingPeriod,
          qualifier.contactId,
          '1',
          10
        );

        expect(returnedTarget).to.equal(expectedTarget);
        expect(dataContextBind.calledOnceWithExactly(Target.v1.getPage)).to.be.true;
        expect(reportGet.calledOnceWithExactly(qualifier, '1', 10)).to.be.true;
      });

      it('getByReportingPeriodContactIds multiple contact Ids', () => {
        const mockAsyncGenerator = fakeGenerator();
        const reportGet = sinon.stub().returns(mockAsyncGenerator);
        dataContextBind.returns(reportGet);
        const qualifier = Qualifier.and(
          Qualifier.byReportingPeriod('2020-01'),
          Qualifier.byContactIds(['my-first-contact-uuid', 'my-second-contact-uuid'])
        );

        const returnedTarget = target.getByReportingPeriodContactIds(
          qualifier.reportingPeriod,
          qualifier.contactIds
        );

        expect(returnedTarget).to.deep.equal(mockAsyncGenerator);
        expect(reportGet.calledOnceWithExactly(qualifier)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Target.v1.getAll)).to.be.true;
      });

      it('getByReportingPeriodContactIds since contact Id', () => {
        const mockAsyncGenerator = fakeGenerator();
        const reportGet = sinon.stub().returns(mockAsyncGenerator);
        dataContextBind.returns(reportGet);
        const qualifier = Qualifier.and(
          Qualifier.byReportingPeriod('2020-01'),
          Qualifier.byContactId('my-first-contact-uuid')
        );

        const returnedTarget = target.getByReportingPeriodContactIds(
          qualifier.reportingPeriod,
          qualifier.contactId
        );

        expect(returnedTarget).to.deep.equal(mockAsyncGenerator);
        expect(reportGet.calledOnceWithExactly(qualifier)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Target.v1.getAll)).to.be.true;
      });
    });
  });
});
