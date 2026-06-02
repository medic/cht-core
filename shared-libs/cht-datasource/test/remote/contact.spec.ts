import * as RemoteEnv from '../../src/remote/libs/data-context';
import { RemoteDataContext } from '../../src/remote/libs/data-context';
import sinon, { SinonStub } from 'sinon';
import { expect } from 'chai';

describe('remote contact', () => {
  const remoteContext = {} as RemoteDataContext;
  const sandbox = sinon.createSandbox();
  const postSummaryResourceOuter = sandbox.stub();

  let Contact: typeof import('../../src/remote/contact');
  let getResourceInner: SinonStub;
  let getResourceOuter: SinonStub;
  let getResourcesInner: SinonStub;
  let getResourcesOuter: SinonStub;
  let postSummaryResourceInner: SinonStub;

  before(() => {
    sinon
      .stub(RemoteEnv, 'postResource')
      .withArgs('api/v1/contact/summary')
      .returns(postSummaryResourceOuter);

    Reflect.deleteProperty(require.cache, require.resolve('../../src/remote/contact'));
    Contact = require('../../src/remote/contact');
  });

  beforeEach(() => {
    getResourceInner = sinon.stub();
    getResourceOuter = sinon.stub(RemoteEnv, 'getResource').returns(getResourceInner);
    getResourcesInner = sinon.stub();
    getResourcesOuter = sinon.stub(RemoteEnv, 'getResources').returns(getResourcesInner);
    postSummaryResourceInner = sinon.stub();
    postSummaryResourceOuter.returns(postSummaryResourceInner);
  });

  afterEach(() => {
    sinon.restore();
    sandbox.reset();
  });

  describe('v1', () => {
    const identifier = { uuid: 'uuid' } as const;

    describe('get', () => {
      it('returns a contact by UUID', async () => {
        const doc = { type: 'person' };
        getResourceInner.resolves(doc);

        const result = await Contact.v1.get(remoteContext)(identifier);

        expect(result).to.equal(doc);
        expect(getResourceOuter.calledOnceWithExactly(remoteContext, 'api/v1/contact')).to.be.true;
        expect(getResourceInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        getResourceInner.resolves(null);

        const result = await Contact.v1.get(remoteContext)(identifier);

        expect(result).to.be.null;
        expect(getResourceOuter.calledOnceWithExactly(remoteContext, 'api/v1/contact')).to.be.true;
        expect(getResourceInner.calledOnceWithExactly(identifier.uuid)).to.be.true;
      });
    });

    describe('getWithLineage', () => {
      it('returns a contact with lineage by UUID', async () => {
        const doc = { type: 'person' };
        getResourceInner.resolves(doc);

        const result = await Contact.v1.getWithLineage(remoteContext)(identifier);

        expect(result).to.equal(doc);
        expect(getResourceOuter.calledOnceWithExactly(remoteContext, 'api/v1/contact')).to.be.true;
        expect(getResourceInner.calledOnceWithExactly(identifier.uuid, { with_lineage: 'true' })).to.be.true;
      });

      it('returns null if the identified doc is not found', async () => {
        getResourceInner.resolves(null);

        const result = await Contact.v1.getWithLineage(remoteContext)(identifier);

        expect(result).to.be.null;
        expect(getResourceOuter.calledOnceWithExactly(remoteContext, 'api/v1/contact')).to.be.true;
        expect(getResourceInner.calledOnceWithExactly(identifier.uuid, { with_lineage: 'true' })).to.be.true;
      });
    });

    describe('getSummaries', () => {
      it('returns empty array when given no uuids', async () => {
        const result = await Contact.v1.getSummaries(remoteContext)([]);

        expect(result).to.deep.equal([]);
        expect(postSummaryResourceOuter.notCalled).to.be.true;
        expect(postSummaryResourceInner.notCalled).to.be.true;
      });

      it('POSTs the uuids array to the contact summary endpoint', async () => {
        const summaries = [{ _id: 'a' }, { _id: 'b' }];
        postSummaryResourceInner.resolves(summaries);

        const result = await Contact.v1.getSummaries(remoteContext)(['a', 'b']);

        expect(result).to.equal(summaries);
        expect(postSummaryResourceOuter.calledOnceWithExactly(remoteContext)).to.be.true;
        expect(postSummaryResourceInner.calledOnceWithExactly({ uuids: ['a', 'b'] })).to.be.true;
      });
    });

    describe('getUuidsPage', () => {
      const limit = 3;
      const cursor = '1';
      const contactType = 'person';
      const freetext = 'contact';
      const qualifier = {
        contactType,
        freetext
      };
      const queryParam = {
        limit: limit.toString(),
        freetext: freetext,
        type: contactType,
        cursor,
      };

      it('returns array of contact identifiers', async () => {
        const doc = [{ type: 'person' }, { type: 'person' }];
        const expectedResponse = { data: doc, cursor };
        getResourcesInner.resolves(expectedResponse);

        const result = await Contact.v1.getUuidsPage(remoteContext)(qualifier, cursor, limit);

        expect(result).to.equal(expectedResponse);
        expect(getResourcesOuter.calledOnceWithExactly(remoteContext, 'api/v1/contact/uuid')).to.be.true;
        expect(getResourcesInner.calledOnceWithExactly(queryParam)).to.be.true;
      });

      it('returns empty array if docs are not found', async () => {
        getResourcesInner.resolves([]);

        const result = await Contact.v1.getUuidsPage(remoteContext)(qualifier, cursor, limit);

        expect(result).to.deep.equal([]);
        expect(getResourcesOuter.calledOnceWithExactly(remoteContext, 'api/v1/contact/uuid')).to.be.true;
        expect(getResourcesInner.calledOnceWithExactly(queryParam)).to.be.true;
      });

      it('omits cursor param when cursor is null', async () => {
        const expectedResponse = { data: [], cursor: null };
        getResourcesInner.resolves(expectedResponse);

        const result = await Contact.v1.getUuidsPage(remoteContext)(qualifier, null, limit);

        expect(result).to.equal(expectedResponse);
        expect(getResourcesInner.calledOnceWithExactly({
          limit: limit.toString(),
          freetext: freetext,
          type: contactType,
        })).to.be.true;
      });

      it('omits type param when qualifier is freetext-only', async () => {
        const freetextOnly = { freetext };
        const expectedResponse = { data: [], cursor: null };
        getResourcesInner.resolves(expectedResponse);

        const result = await Contact.v1.getUuidsPage(remoteContext)(freetextOnly, cursor, limit);

        expect(result).to.equal(expectedResponse);
        expect(getResourcesInner.calledOnceWithExactly({
          limit: limit.toString(),
          cursor,
          freetext,
        })).to.be.true;
      });

      it('omits freetext param when qualifier is contactType-only', async () => {
        const typeOnly = { contactType };
        const expectedResponse = { data: [], cursor: null };
        getResourcesInner.resolves(expectedResponse);

        const result = await Contact.v1.getUuidsPage(remoteContext)(typeOnly, cursor, limit);

        expect(result).to.equal(expectedResponse);
        expect(getResourcesInner.calledOnceWithExactly({
          limit: limit.toString(),
          cursor,
          type: contactType,
        })).to.be.true;
      });
    });
  });
});
