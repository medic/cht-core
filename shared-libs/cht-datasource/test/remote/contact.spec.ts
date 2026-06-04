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

      // The single-phone qualifier dispatches a GET (phone as query param); the bulk-phones qualifier
      // POSTs the array in the body. Both share the same request/response and cursor handling.
      const phone = '+15551234567';
      const phones: [string, ...string[]] = ['+15551234567', '+15559999999'];
      ([
        {
          label: 'phone qualifier',
          qualifier: { phone },
          // GET: query params, limit serialized to string
          callStub: () => getResourcesInner,
          verifyDispatch: () => {
            expect(getResourcesOuter.calledOnceWithExactly(remoteContext, 'api/v1/contact/uuid')).to.be.true;
          },
          params: (withCursor: boolean) => ({
            limit: limit.toString(),
            ...(withCursor ? { cursor } : {}),
            phone,
          }),
        },
        {
          label: 'phones qualifier (bulk)',
          qualifier: { phones },
          // POST: array in the body, limit kept numeric, three-layer postResource chain
          callStub: () => postResourceInnermost,
          verifyDispatch: () => {
            expect(postResourceOuter.calledOnceWithExactly('api/v1/contact/uuid')).to.be.true;
            expect(postResourceMiddle.calledOnceWithExactly(remoteContext)).to.be.true;
          },
          params: (withCursor: boolean) => ({
            phones,
            limit,
            ...(withCursor ? { cursor } : {}),
          }),
        },
      ]).forEach(({ label, qualifier, callStub, verifyDispatch, params }) => {
        describe(label, () => {
          it('dispatches the request with the qualifier and returns the response', async () => {
            const expectedResponse = { data: ['a'], cursor };
            callStub().resolves(expectedResponse);

            const result = await Contact.v1.getUuidsPage(remoteContext)(qualifier, cursor, limit);

            expect(result).to.equal(expectedResponse);
            verifyDispatch();
            expect(callStub().calledOnceWithExactly(params(true))).to.be.true;
          });

          it('omits cursor when cursor is null', async () => {
            callStub().resolves({ data: [], cursor: null });

            await Contact.v1.getUuidsPage(remoteContext)(qualifier, null, limit);

            expect(callStub().calledOnceWithExactly(params(false))).to.be.true;
          });
        });
      });
    });
  });
});
