import * as RemoteEnv from '../../src/remote/libs/data-context';
import { RemoteDataContext } from '../../src/remote/libs/data-context';
import sinon, { SinonStub } from 'sinon';
import { expect } from 'chai';
import { DOC_TYPES } from '@medic/constants';

describe('remote report', () => {
  const remoteContext = {} as RemoteDataContext;
  const sandbox = sinon.createSandbox();
  const postResourceOuter = sandbox.stub();
  const putResourceOuter = sandbox.stub();

  let Report: typeof import('../../src/remote/report');
  let getResourceInner: SinonStub;
  let getResourceOuter: SinonStub;
  let getResourcesInner: SinonStub;
  let getResourcesOuter: SinonStub;
  let postResourceInner: SinonStub;
  let putResourceInner: SinonStub;

  before(() => {
    sinon
      .stub(RemoteEnv, 'postResource')
      .withArgs('api/v1/report')
      .returns(postResourceOuter);
    sinon
      .stub(RemoteEnv, 'putResource')
      .withArgs('api/v1/report')
      .returns(putResourceOuter);

    Reflect.deleteProperty(require.cache, require.resolve('../../src/remote/report'));
    Report = require('../../src/remote/report');
  });

  beforeEach(() => {
    getResourceInner = sinon.stub();
    getResourceOuter = sinon.stub(RemoteEnv, 'getResource').returns(getResourceInner);
    getResourcesInner = sinon.stub();
    getResourcesOuter = sinon.stub(RemoteEnv, 'getResources').returns(getResourcesInner);
    postResourceInner = sinon.stub();
    postResourceOuter.returns(postResourceInner);
    putResourceInner = sinon.stub();
    putResourceOuter.returns(putResourceInner);
  });

  afterEach(() => {
    sinon.restore();
    sandbox.reset();
  });

  describe('v1', () => {
    const identifier = { uuid: 'uuid' } as const;

    describe('get', () => {
      it('returns a report by UUID', async () => {
        const doc = { type: DOC_TYPES.DATA_RECORD, form: 'yes' };
        getResourceInner.resolves(doc);

        const result = await Report.v1.get(remoteContext)(identifier);

        expect(result).to.equal(doc);
        expect(getResourceOuter.calledOnceWithExactly(remoteContext, 'api/v1/report')).to.be.true;
        expect(getResourceInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        getResourceInner.resolves(null);

        const result = await Report.v1.get(remoteContext)(identifier);

        expect(result).to.be.null;
        expect(getResourceOuter.calledOnceWithExactly(remoteContext, 'api/v1/report')).to.be.true;
        expect(getResourceInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
      });
    });

    describe('getWithLineage', () => {
      it('returns a report with lineage by UUID', async () => {
        const doc = {
          type: DOC_TYPES.DATA_RECORD,
          form: 'yes',
          lineage: ['parent1', 'parent2']
        };
        getResourceInner.resolves(doc);

        const result = await Report.v1.getWithLineage(remoteContext)(identifier);

        expect(result).to.equal(doc);
        expect(getResourceOuter.calledOnceWithExactly(remoteContext, 'api/v1/report')).to.be.true;
        expect(getResourceInner.calledOnceWithExactly(identifier.uuid, { with_lineage: 'true' })).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        getResourceInner.resolves(null);

        const result = await Report.v1.getWithLineage(remoteContext)(identifier);

        expect(result).to.be.null;
        expect(getResourceOuter.calledOnceWithExactly(remoteContext, 'api/v1/report')).to.be.true;
        expect(getResourceInner.calledOnceWithExactly(identifier.uuid, { with_lineage: 'true' })).to.be.true;
      });
    });

    describe('getUuidsPage', () => {
      const limit = 3;
      const cursor = '1';
      const freetext = 'report';
      const qualifier = {
        freetext
      };
      const queryParam = {
        limit: limit.toString(),
        freetext: freetext,
        cursor,
      };

      it('returns an array of report identifiers', async () => {
        const doc = [{ type: DOC_TYPES.DATA_RECORD, form: 'yes' }, { type: DOC_TYPES.DATA_RECORD, form: 'yes' }];
        const expectedResponse = { data: doc, cursor };
        getResourcesInner.resolves(expectedResponse);

        const result = await Report.v1.getUuidsPage(remoteContext)(qualifier, cursor, limit);

        expect(result).to.equal(expectedResponse);
        expect(getResourcesOuter.calledOnceWithExactly(remoteContext, 'api/v1/report/uuid')).to.be.true;
        expect(getResourcesInner.calledOnceWithExactly(queryParam)).to.be.true;
      });

      it('returns empty array if docs are not found', async () => {
        getResourcesInner.resolves([]);

        const result = await Report.v1.getUuidsPage(remoteContext)(qualifier, cursor, limit);

        expect(result).to.deep.equal([]);
        expect(getResourcesOuter.calledOnceWithExactly(remoteContext, 'api/v1/report/uuid')).to.be.true;
        expect(getResourcesInner.calledOnceWithExactly(queryParam)).to.be.true;
      });

      it('omits cursor param when cursor is null', async () => {
        const expectedResponse = { data: [], cursor: null };
        getResourcesInner.resolves(expectedResponse);

        const result = await Report.v1.getUuidsPage(remoteContext)(qualifier, null, limit);

        expect(result).to.equal(expectedResponse);
        expect(getResourcesInner.calledOnceWithExactly({
          limit: limit.toString(),
          freetext: freetext,
        })).to.be.true;
      });
    });

    describe('create', () => {
      it('returns a report doc for a valid input', async () => {
        const input = {
          form: 'form-1',
          type: 'report',
          reported_date: 11223344,
          contact: 'c1'
        };
        const expectedDoc = { ...input, _id: '1', _rev: '1' };
        postResourceInner.resolves(expectedDoc);

        const reportDoc = await Report.v1.create(remoteContext)(input);

        expect(reportDoc).to.deep.equal(expectedDoc);
        expect(postResourceOuter.calledOnceWithExactly(remoteContext)).to.be.true;
        expect(postResourceInner.calledOnceWithExactly(input)).to.be.true;
      });
    });

    describe('update', () => {
      it('returns an updated report doc for a valid input', async () => {
        const input = {
          form: 'form-1',
          type: 'report',
          reported_date: 11223344,
          contact: {
            _id: '3'
          }, _id: '1', _rev: '2'
        };
        const expectedDoc = { ...input, _rev: '2' };
        putResourceInner.resolves(expectedDoc);

        const reportDoc = await Report.v1.update(remoteContext)(input);

        expect(reportDoc).to.deep.equal(input);
        expect(putResourceOuter.calledOnceWithExactly(remoteContext)).to.be.true;
        expect(putResourceInner.calledOnceWithExactly(input)).to.be.true;
      });
    });
  });
});
