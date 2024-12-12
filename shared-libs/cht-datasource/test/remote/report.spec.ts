import { RemoteDataContext } from '../../src/remote/libs/data-context';
import sinon, { SinonStub } from 'sinon';
import * as RemoteEnv from '../../src/remote/libs/data-context';
import * as Report from '../../src/remote/report';
import { expect } from 'chai';

describe('remote report', () => {
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
    const identifier = {uuid: 'uuid'} as const;

    describe('get', () => {
      it('returns a report by UUID', async () => {
        const doc = { type: 'data_record', form: 'yes' };
        getResourceInner.resolves(doc);

        // eslint-disable-next-line compat/compat
        const result = await Report.v1.get(remoteContext)(identifier);

        expect(result).to.equal(doc);
        expect(getResourceOuter.calledOnceWithExactly(remoteContext, 'api/v1/report')).to.be.true;
        expect(getResourceInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        getResourceInner.resolves(null);

        // eslint-disable-next-line compat/compat
        const result = await Report.v1.get(remoteContext)(identifier);

        expect(result).to.be.null;
        expect(getResourceOuter.calledOnceWithExactly(remoteContext, 'api/v1/report')).to.be.true;
        expect(getResourceInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
      });
    });

    describe('getPage', () => {
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
        const doc = [{ type: 'data_record', form: 'yes' }, {type: 'data_record', form: 'yes'}];
        const expectedResponse = { data: doc, cursor };
        getResourcesInner.resolves(expectedResponse);

        // eslint-disable-next-line compat/compat
        const result = await Report.v1.getPage(remoteContext)(qualifier, cursor, limit);

        expect(result).to.equal(expectedResponse);
        expect(getResourcesOuter.calledOnceWithExactly(remoteContext, 'api/v1/report/id')).to.be.true;
        expect(getResourcesInner.calledOnceWithExactly(queryParam)).to.be.true;
      });

      it('returns empty array if docs are not found', async () => {
        getResourcesInner.resolves([]);

        // eslint-disable-next-line compat/compat
        const result = await Report.v1.getPage(remoteContext)(qualifier, cursor, limit);

        expect(result).to.deep.equal([]);
        expect(getResourcesOuter.calledOnceWithExactly(remoteContext, 'api/v1/report/id')).to.be.true;
        expect(getResourcesInner.calledOnceWithExactly(queryParam)).to.be.true;
      });
    });
  });
});
