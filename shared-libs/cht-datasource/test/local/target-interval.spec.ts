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
          `No target interval found for identifier [${identifier.uuid}].`
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
    
  });
});
