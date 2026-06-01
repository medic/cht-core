import * as RemoteEnv from '../../src/remote/libs/data-context';
import { RemoteDataContext } from '../../src/remote/libs/data-context';
import sinon, { SinonStub } from 'sinon';
import * as Contact from '../../src/remote/contact';
import { expect } from 'chai';

describe('remote contact', () => {
  const remoteContext = {} as RemoteDataContext;
  let getResourceInner: SinonStub;
  let getResourceOuter: SinonStub;
  let getResourcesInner: SinonStub;
  let getResourcesOuter: SinonStub;

  let postResourceInnermost: SinonStub;  // (body) => Promise<T>
  let postResourceMiddle: SinonStub;     // (context) => (body)
  let postResourceOuter: SinonStub;      // (path) => (context)

  beforeEach(() => {
    getResourceInner = sinon.stub();
    getResourceOuter = sinon.stub(RemoteEnv, 'getResource').returns(getResourceInner);
    getResourcesInner = sinon.stub();
    getResourcesOuter = sinon.stub(RemoteEnv, 'getResources').returns(getResourcesInner);
    postResourceInnermost = sinon.stub();
    postResourceMiddle = sinon.stub().returns(postResourceInnermost);
    postResourceOuter = sinon.stub(RemoteEnv, 'postResource').returns(postResourceMiddle);
  });

  afterEach(() => sinon.restore());

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

      describe('phone qualifier', () => {
        const phone = '+15551234567';
        const phoneQualifier = { phone };

        it('passes the phone as a query param to the existing endpoint', async () => {
          const expectedResponse = { data: ['a'], cursor };
          getResourcesInner.resolves(expectedResponse);

          const result = await Contact.v1.getUuidsPage(remoteContext)(phoneQualifier, cursor, limit);

          expect(result).to.equal(expectedResponse);
          expect(getResourcesOuter.calledOnceWithExactly(remoteContext, 'api/v1/contact/uuid')).to.be.true;
          expect(getResourcesInner.calledOnceWithExactly({
            limit: limit.toString(),
            cursor,
            phone,
          })).to.be.true;
        });

        it('omits cursor param when cursor is null', async () => {
          const expectedResponse = { data: [], cursor: null };
          getResourcesInner.resolves(expectedResponse);

          await Contact.v1.getUuidsPage(remoteContext)(phoneQualifier, null, limit);

          expect(getResourcesInner.calledOnceWithExactly({
            limit: limit.toString(),
            phone,
          })).to.be.true;
        });

        it('passes the phone value as-is (no normalization)', async () => {
          const rawPhone = '+1 (555) 123-4567';
          getResourcesInner.resolves({ data: [], cursor: null });

          await Contact.v1.getUuidsPage(remoteContext)({ phone: rawPhone }, null, limit);

          expect(getResourcesInner.calledOnceWithExactly({
            limit: limit.toString(),
            phone: rawPhone,
          })).to.be.true;
        });

        it('walks two cursor pages with limit 5', async () => {
          const firstPage = { data: ['a', 'b', 'c', 'd', 'e'], cursor: '5' };
          const secondPage = { data: ['f', 'g'], cursor: null };
          getResourcesInner.onFirstCall().resolves(firstPage);
          getResourcesInner.onSecondCall().resolves(secondPage);

          const page1 = await Contact.v1.getUuidsPage(remoteContext)(phoneQualifier, null, 5);
          expect(page1).to.deep.equal(firstPage);
          expect(getResourcesInner.firstCall.args[0]).to.deep.equal({ limit: '5', phone });

          const page2 = await Contact.v1.getUuidsPage(remoteContext)(phoneQualifier, page1.cursor, 5);
          expect(page2).to.deep.equal(secondPage);
          expect(getResourcesInner.secondCall.args[0]).to.deep.equal({ limit: '5', cursor: '5', phone });
        });
      });

      describe('phones qualifier (bulk)', () => {
        const phones: [string, ...string[]] = ['+15551234567', '+15559999999'];
        const phonesQualifier = { phones };

        it('POSTs to the same path with phones in the JSON body', async () => {
          const expectedResponse = { data: ['a', 'b'], cursor };
          postResourceInnermost.resolves(expectedResponse);

          const result = await Contact.v1.getUuidsPage(remoteContext)(phonesQualifier, cursor, limit);

          expect(result).to.equal(expectedResponse);
          expect(postResourceOuter.calledOnceWithExactly('api/v1/contact/uuid')).to.be.true;
          expect(postResourceMiddle.calledOnceWithExactly(remoteContext)).to.be.true;
          expect(postResourceInnermost.calledOnceWithExactly({
            phones,
            limit,
            cursor,
          })).to.be.true;
          // GET endpoint not touched
          expect(getResourcesInner.notCalled).to.be.true;
        });

        it('omits cursor from the body when cursor is null', async () => {
          postResourceInnermost.resolves({ data: [], cursor: null });

          await Contact.v1.getUuidsPage(remoteContext)(phonesQualifier, null, limit);

          expect(postResourceInnermost.calledOnceWithExactly({
            phones,
            limit,
          })).to.be.true;
        });

        it('walks two cursor pages with limit 5', async () => {
          const firstPage = { data: ['a', 'b', 'c', 'd', 'e'], cursor: '5' };
          const secondPage = { data: ['f'], cursor: null };
          postResourceInnermost.onFirstCall().resolves(firstPage);
          postResourceInnermost.onSecondCall().resolves(secondPage);

          const page1 = await Contact.v1.getUuidsPage(remoteContext)(phonesQualifier, null, 5);
          expect(page1).to.deep.equal(firstPage);
          expect(postResourceInnermost.firstCall.args[0]).to.deep.equal({ phones, limit: 5 });

          const page2 = await Contact.v1.getUuidsPage(remoteContext)(phonesQualifier, page1.cursor, 5);
          expect(page2).to.deep.equal(secondPage);
          expect(postResourceInnermost.secondCall.args[0]).to.deep.equal({ phones, limit: 5, cursor: '5' });
        });
      });
    });
  });
});
