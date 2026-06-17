import { DataContext, Page } from '../src';
import sinon, { SinonStub } from 'sinon';
import * as Context from '../src/libs/data-context';
import * as Local from '../src/local';
import * as Remote from '../src/remote';
import * as Qualifier from '../src/qualifier';
import * as Contact from '../src/contact';
import { expect } from 'chai';
import * as Core from '../src/libs/core';
import { fakeGenerator } from './utils';

describe('contact', () => {
  const dataContext = { bind: () => null } as DataContext;
  let dataContextBind: SinonStub;
  let assertDataContext: SinonStub;
  let adapt: SinonStub;
  let isUuidQualifier: SinonStub;
  let isContactTypeQualifier: SinonStub;
  let isFreetextQualifier: SinonStub;

  beforeEach(() => {
    dataContextBind = sinon.stub(dataContext, 'bind');
    assertDataContext = sinon.stub(Context, 'assertDataContext');
    adapt = sinon.stub(Context, 'adapt');
    isUuidQualifier = sinon.stub(Qualifier, 'isUuidQualifier');
    isContactTypeQualifier = sinon.stub(Qualifier, 'isContactTypeQualifier');
    isFreetextQualifier = sinon.stub(Qualifier, 'isFreetextQualifier');
  });

  afterEach(() => sinon.restore());

  describe('v1', () => {
    describe('get', () => {
      const contact = { _id: 'my-contact' } as Contact.v1.Contact;
      const qualifier = { uuid: contact._id } as const;
      let getContact: SinonStub;

      beforeEach(() => {
        getContact = sinon.stub();
        adapt.returns(getContact);
      });

      it('retrieves the contact for the given qualifier from the data context', async () => {
        isUuidQualifier.returns(true);
        getContact.returns(contact);

        const result = await Contact.v1.get(dataContext)(qualifier);

        expect(result).to.equal(contact);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Contact.v1.get, Remote.Contact.v1.get)).to.be.true;
        expect(isUuidQualifier.calledOnceWithExactly(qualifier)).to.be.true;
        expect(getContact.calledOnceWithExactly(qualifier)).to.be.true;
      });

      it('throws an error if the qualifier is invalid', async () => {
        isUuidQualifier.returns(false);

        await expect(Contact.v1.get(dataContext)(qualifier))
          .to.be.rejectedWith(`Invalid identifier [${JSON.stringify(qualifier)}].`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(dataContext, Local.Contact.v1.get, Remote.Contact.v1.get)).to.be.true;
        expect(isUuidQualifier.calledOnceWithExactly(qualifier)).to.be.true;
        expect(getContact.notCalled).to.be.true;
      });

      it('throws an error if the data context is invalid', () => {
        assertDataContext.throws(new Error(`Invalid data context [null].`));

        expect(() => Contact.v1.get(dataContext)).to.throw(`Invalid data context [null].`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.notCalled).to.be.true;
        expect(isUuidQualifier.notCalled).to.be.true;
        expect(getContact.notCalled).to.be.true;
      });
    });

    describe('getWithLineage', () => {
      const contact = { _id: 'my-contact' } as Contact.v1.Contact;
      const qualifier = { uuid: contact._id } as const;
      let getContactWithLineage: SinonStub;

      beforeEach(() => {
        getContactWithLineage = sinon.stub();
        adapt.returns(getContactWithLineage);
      });

      it('retrieves the contact with lineage for the given qualifier from the data context', async () => {
        isUuidQualifier.returns(true);
        getContactWithLineage.resolves(contact);

        const result = await Contact.v1.getWithLineage(dataContext)(qualifier);

        expect(result).to.equal(contact);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(
          dataContext,
          Local.Contact.v1.getWithLineage,
          Remote.Contact.v1.getWithLineage
        )).to.be.true;
        expect(isUuidQualifier.calledOnceWithExactly(qualifier)).to.be.true;
        expect(getContactWithLineage.calledOnceWithExactly(qualifier)).to.be.true;
      });

      it('throws an error if the qualifier is invalid', async () => {
        isUuidQualifier.returns(false);

        await expect(Contact.v1.getWithLineage(dataContext)(qualifier))
          .to.be.rejectedWith(`Invalid identifier [${JSON.stringify(qualifier)}].`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.calledOnceWithExactly(
          dataContext,
          Local.Contact.v1.getWithLineage,
          Remote.Contact.v1.getWithLineage
        )).to.be.true;
        expect(isUuidQualifier.calledOnceWithExactly(qualifier)).to.be.true;
        expect(getContactWithLineage.notCalled).to.be.true;
      });

      it('throws an error if the data context is invalid', () => {
        assertDataContext.throws(new Error(`Invalid data context [null].`));

        expect(() => Contact.v1.getWithLineage(dataContext)).to.throw(`Invalid data context [null].`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.notCalled).to.be.true;
        expect(isUuidQualifier.notCalled).to.be.true;
        expect(getContactWithLineage.notCalled).to.be.true;
      });
    });

    // The cursor/limit/qualifier validation, defaults and delegation are exercised once against the shared
    // factory in test/libs/paginated.spec.ts. These tests only assert the per-noun wiring.
    describe('getUuidsPage', () => {
      const cursor = '1';
      const pageData = { data: ['contact1', 'contact2', 'contact3'], cursor };
      const qualifier = { contactType: 'person', freetext: 'freetext' } as const;
      const invalidQualifier = { contactType: 'invalidContactType' } as const;
      let getIdsPage: SinonStub;

      beforeEach(() => {
        getIdsPage = sinon.stub().resolves(pageData);
        adapt.returns(getIdsPage);
      });

      it('delegates to the id-page local/remote implementations', async () => {
        isContactTypeQualifier.returns(true);
        isFreetextQualifier.returns(true);

        const result = await Contact.v1.getUuidsPage(dataContext)(qualifier, cursor, 3);

        expect(result).to.equal(pageData);
        expect(
          adapt.calledOnceWithExactly(dataContext, Local.Contact.v1.getUuidsPage, Remote.Contact.v1.getUuidsPage)
        ).to.be.true;
        expect(getIdsPage.calledOnceWithExactly(qualifier, cursor, 3)).to.be.true;
      });

      it('defaults to the ids page limit', async () => {
        isContactTypeQualifier.returns(true);
        isFreetextQualifier.returns(true);

        await Contact.v1.getUuidsPage(dataContext)(qualifier);

        expect(getIdsPage.calledOnceWithExactly(qualifier, null, 10000)).to.be.true;
      });

      it('validates with the contact-type/freetext qualifier assertion', async () => {
        isContactTypeQualifier.returns(false);
        isFreetextQualifier.returns(false);

        await expect(Contact.v1.getUuidsPage(dataContext)(invalidQualifier)).to.be.rejectedWith(
          `Invalid qualifier [${JSON.stringify(invalidQualifier)}]. Must be a contact type and/or freetext qualifier.`
        );
        expect(getIdsPage.notCalled).to.be.true;
      });
    });

    describe('getUuids', () => {
      const qualifier = { contactType: 'person', freetext: 'freetext' } as const;
      const invalidQualifier = { contactType: 'invalidContactType' } as const;
      const mockGenerator = {} as AsyncGenerator<string, null>;
      let contactGetIdsPage: SinonStub;
      let getPagedGenerator: SinonStub;

      beforeEach(() => {
        contactGetIdsPage = sinon.stub(Contact.v1, 'getUuidsPage');
        dataContext.bind = sinon.stub().returns(contactGetIdsPage);
        getPagedGenerator = sinon.stub(Core, 'getPagedGenerator').returns(mockGenerator);
      });

      it('drains the id-page getter into a generator', () => {
        isContactTypeQualifier.returns(true);
        isFreetextQualifier.returns(true);

        const generator = Contact.v1.getUuids(dataContext)(qualifier);

        expect(generator).to.equal(mockGenerator);
        expect(getPagedGenerator.calledOnceWithExactly(contactGetIdsPage, qualifier)).to.be.true;
      });

      it('validates with the contact-type/freetext qualifier assertion', () => {
        isContactTypeQualifier.returns(false);
        isFreetextQualifier.returns(false);

        expect(() => Contact.v1.getUuids(dataContext)(invalidQualifier)).to.throw(
          `Invalid qualifier [${JSON.stringify(invalidQualifier)}]. Must be a contact type and/or freetext qualifier.`
        );
        expect(getPagedGenerator.notCalled).to.be.true;
      });
    });

    describe('getPage', () => {
      const cursor = '1';
      const pageData = { data: [{ _id: 'contact1' }, { _id: 'contact2' }] as Contact.v1.Contact[], cursor };
      let getDocsPage: SinonStub;

      beforeEach(() => {
        getDocsPage = sinon.stub().resolves(pageData);
        adapt.returns(getDocsPage);
      });

      it('delegates to the doc-page local/remote implementations (no qualifier - all contacts)', async () => {
        const result = await Contact.v1.getPage(dataContext)(undefined, cursor, 3);

        expect(result).to.equal(pageData);
        expect(adapt.calledOnceWithExactly(dataContext, Local.Contact.v1.getPage, Remote.Contact.v1.getPage))
          .to.be.true;
        expect(getDocsPage.calledOnceWithExactly(undefined, cursor, 3)).to.be.true;
      });

      it('defaults to the docs page limit', async () => {
        await Contact.v1.getPage(dataContext)();

        expect(getDocsPage.calledOnceWithExactly(undefined, null, 100)).to.be.true;
      });

      it('rejects a qualifier (none is supported yet)', async () => {
        await expect(Contact.v1.getPage(dataContext)({ unexpected: true } as unknown as undefined))
          .to.be.rejectedWith('Unsupported qualifier [{"unexpected":true}].');
        expect(getDocsPage.notCalled).to.be.true;
      });
    });

    describe('getAll', () => {
      const mockGenerator = {} as AsyncGenerator<Contact.v1.Contact, null>;
      let boundPage: SinonStub;
      let bind: SinonStub;
      let getPagedGenerator: SinonStub;

      beforeEach(() => {
        boundPage = sinon.stub();
        bind = sinon.stub().returns(boundPage);
        dataContext.bind = bind;
        getPagedGenerator = sinon.stub(Core, 'getPagedGenerator').returns(mockGenerator);
      });

      it('returns a generator that drains all contacts (no qualifier)', () => {
        const generator = Contact.v1.getAll(dataContext)();

        expect(generator).to.equal(mockGenerator);
        expect(bind.calledOnceWithExactly(Contact.v1.getPage)).to.be.true;
        expect(getPagedGenerator.calledOnceWithExactly(boundPage, undefined)).to.be.true;
      });
    });

    describe('getDatasource', () => {
      let contact: Contact.v1.Datasource;

      beforeEach(() => contact = Contact.v1.getDatasource(dataContext));

      it('contains expected keys', () => {
        expect(contact).to.have.all.keys(
          [
            'getByUuid',
            'getByUuidWithLineage',
            'getUuidsByTypeFreetext',
            'getUuidsPageByTypeFreetext',
            'getUuidsPageByFreetext',
            'getUuidsByFreetext',
            'getUuidsPageByType',
            'getUuidsByType',
          ]
        );
      });

      it('getByUuid', async () => {
        const expectedContact = {};
        const contactGet = sinon.stub().resolves(expectedContact);
        dataContextBind.returns(contactGet);
        const qualifier = { uuid: 'my-contact-uuid' };
        const byUuid = sinon.stub(Qualifier, 'byUuid').returns(qualifier);

        const returnedContact = await contact.getByUuid(qualifier.uuid);

        expect(returnedContact).to.equal(expectedContact);
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.get)).to.be.true;
        expect(contactGet.calledOnceWithExactly(qualifier)).to.be.true;
        expect(byUuid.calledOnceWithExactly(qualifier.uuid)).to.be.true;
      });

      it('getByUuidWithLineage', async () => {
        const expectedContact = {};
        const contactGet = sinon.stub().resolves(expectedContact);
        dataContextBind.returns(contactGet);
        const qualifier = { uuid: 'my-contact-uuid' };
        const byUuid = sinon.stub(Qualifier, 'byUuid').returns(qualifier);

        const returnedContact = await contact.getByUuidWithLineage(qualifier.uuid);

        expect(returnedContact).to.equal(expectedContact);
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.getWithLineage)).to.be.true;
        expect(contactGet.calledOnceWithExactly(qualifier)).to.be.true;
        expect(byUuid.calledOnceWithExactly(qualifier.uuid)).to.be.true;
      });

      it('getUuidsPageByTypeFreetext uses default cursor and limit', async () => {
        const expectedContactIds: Page<Contact.v1.Contact> = {data: [], cursor: null};
        const contactGetIdsPage = sinon.stub().resolves(expectedContactIds);
        dataContextBind.returns(contactGetIdsPage);
        const freetext = 'abc';
        const contactType = 'person';
        const qualifier = { contactType, freetext };
        sinon.stub(Qualifier, 'and').returns(qualifier);
        sinon.stub(Qualifier, 'byFreetext').returns({ freetext });
        sinon.stub(Qualifier, 'byContactType').returns({ contactType });

        const returnedContactIds = await contact.getUuidsPageByTypeFreetext(freetext, contactType);

        expect(returnedContactIds).to.equal(expectedContactIds);
        expect(contactGetIdsPage.calledOnceWithExactly(qualifier, null, 10000)).to.be.true;
      });

      it('getUuidsPageByTypeFreetext', async () => {
        const expectedContactIds: Page<Contact.v1.Contact> = { data: [], cursor: null };
        const contactGetIdsPage = sinon.stub().resolves(expectedContactIds);
        dataContextBind.returns(contactGetIdsPage);
        const freetext = 'abc';
        const contactType = 'person';
        const limit = 2;
        const cursor = '1';
        const contactTypeQualifier = { contactType };
        const freetextQualifier = { freetext };
        const qualifier = { contactType, freetext };
        const andQualifier = sinon.stub(Qualifier, 'and').returns(qualifier);
        const byFreetext = sinon.stub(Qualifier, 'byFreetext').returns(freetextQualifier);
        const byContactType = sinon.stub(Qualifier, 'byContactType').returns(contactTypeQualifier);

        const returnedContactIds = await contact.getUuidsPageByTypeFreetext(freetext, contactType, cursor, limit);

        expect(returnedContactIds).to.equal(expectedContactIds);
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.getUuidsPage)).to.be.true;
        expect(
          contactGetIdsPage.calledOnceWithExactly(qualifier, cursor, limit)
        ).to.be.true;
        expect(byFreetext.calledOnceWithExactly(freetext)).to.be.true;
        expect(byContactType.calledOnceWithExactly(contactType)).to.be.true;
        expect(andQualifier.calledOnceWithExactly(freetextQualifier, contactTypeQualifier)).to.be.true;
      });

      it('getUuidsPageByType', async () => {
        const expectedContactIds: Page<Contact.v1.Contact> = { data: [], cursor: null };
        const contactGetIdsPage = sinon.stub().resolves(expectedContactIds);
        dataContextBind.returns(contactGetIdsPage);
        const contactType = 'person';
        const limit = 2;
        const cursor = '1';
        const contactTypeQualifier = { contactType };
        const byContactType = sinon.stub(Qualifier, 'byContactType').returns(contactTypeQualifier);
        const byFreetext = sinon.stub(Qualifier, 'byFreetext');

        const returnedContactIds = await contact.getUuidsPageByType(contactType, cursor, limit);

        expect(returnedContactIds).to.equal(expectedContactIds);
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.getUuidsPage)).to.be.true;
        expect(
          contactGetIdsPage.calledOnceWithExactly(contactTypeQualifier, cursor, limit)
        ).to.be.true;
        expect(byContactType.calledOnceWithExactly(contactType)).to.be.true;
        expect(byFreetext.notCalled).to.be.true;
      });

      it('getUuidsPageByType uses default cursor and limit', async () => {
        const expectedContactIds: Page<Contact.v1.Contact> = {data: [], cursor: null};
        const contactGetIdsPage = sinon.stub().resolves(expectedContactIds);
        dataContextBind.returns(contactGetIdsPage);
        const contactType = 'person';
        const contactTypeQualifier = { contactType };
        sinon.stub(Qualifier, 'byContactType').returns(contactTypeQualifier);

        const returnedContactIds = await contact.getUuidsPageByType(contactType);

        expect(returnedContactIds).to.equal(expectedContactIds);
        expect(contactGetIdsPage.calledOnceWithExactly(contactTypeQualifier, null, 10000)).to.be.true;
      });

      it('getUuidsPageByFreetext', async () => {
        const expectedContactIds: Page<Contact.v1.Contact> = { data: [], cursor: null };
        const contactGetIdsPage = sinon.stub().resolves(expectedContactIds);
        dataContextBind.returns(contactGetIdsPage);
        const freetext = 'abc';
        const limit = 2;
        const cursor = '1';
        const freetextQualifier = { freetext };
        const byFreetext = sinon.stub(Qualifier, 'byFreetext').returns(freetextQualifier);
        const byContactType = sinon.stub(Qualifier, 'byContactType');

        const returnedContactIds = await contact.getUuidsPageByFreetext(freetext, cursor, limit);

        expect(returnedContactIds).to.equal(expectedContactIds);
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.getUuidsPage)).to.be.true;
        expect(
          contactGetIdsPage.calledOnceWithExactly(freetextQualifier, cursor, limit)
        ).to.be.true;
        expect(byFreetext.calledOnceWithExactly(freetext)).to.be.true;
        expect(byContactType.notCalled).to.be.true;
      });

      it('getUuidsPageByFreetext uses default cursor and limit', async () => {
        const expectedContactIds: Page<Contact.v1.Contact> = {data: [], cursor: null};
        const contactGetIdsPage = sinon.stub().resolves(expectedContactIds);
        dataContextBind.returns(contactGetIdsPage);
        const freetext = 'abc';
        const freetextQualifier = { freetext };
        sinon.stub(Qualifier, 'byFreetext').returns(freetextQualifier);

        const returnedContactIds = await contact.getUuidsPageByFreetext(freetext);

        expect(returnedContactIds).to.equal(expectedContactIds);
        expect(contactGetIdsPage.calledOnceWithExactly(freetextQualifier, null, 10000)).to.be.true;
      });

      it('getUuidsByTypeFreetext', () => {
        const mockAsyncGenerator = fakeGenerator();

        const contactGetIds = sinon.stub().returns(mockAsyncGenerator);
        dataContextBind.returns(contactGetIds);
        const freetext = 'abc';
        const contactType = 'person';
        const contactTypeQualifier = { contactType };
        const freetextQualifier = { freetext };
        const qualifier = { contactType, freetext };
        const andQualifier = sinon.stub(Qualifier, 'and').returns(qualifier);
        const byFreetext = sinon.stub(Qualifier, 'byFreetext').returns(freetextQualifier);
        const byContactType = sinon.stub(Qualifier, 'byContactType').returns(contactTypeQualifier);

        const res = contact.getUuidsByTypeFreetext(freetext, contactType);

        expect(res).to.deep.equal(mockAsyncGenerator);
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.getUuids)).to.be.true;
        expect(contactGetIds.calledOnceWithExactly(qualifier)).to.be.true;
        expect(andQualifier.calledOnceWithExactly(freetextQualifier, contactTypeQualifier)).to.be.true;
        expect(byFreetext.calledOnceWithExactly(freetext)).to.be.true;
        expect(byContactType.calledOnceWithExactly(contactType)).to.be.true;
      });

      it('getUuidsByType', () => {
        const mockAsyncGenerator = fakeGenerator();

        const contactGetIds = sinon.stub().returns(mockAsyncGenerator);
        dataContextBind.returns(contactGetIds);
        const contactType = 'person';
        const contactTypeQualifier = { contactType };
        const byContactType = sinon.stub(Qualifier, 'byContactType').returns(contactTypeQualifier);

        const res = contact.getUuidsByType(contactType);

        expect(res).to.deep.equal(mockAsyncGenerator);
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.getUuids)).to.be.true;
        expect(contactGetIds.calledOnceWithExactly(contactTypeQualifier)).to.be.true;
        expect(byContactType.calledOnceWithExactly(contactType)).to.be.true;
      });

      it('getUuidsByFreetext', () => {
        const mockAsyncGenerator = fakeGenerator();

        const contactGetIds = sinon.stub().returns(mockAsyncGenerator);
        dataContextBind.returns(contactGetIds);
        const freetext = 'abc';
        const freetextQualifier = { freetext };
        const byFreetext = sinon.stub(Qualifier, 'byFreetext').returns(freetextQualifier);

        const res = contact.getUuidsByFreetext(freetext);

        expect(res).to.deep.equal(mockAsyncGenerator);
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.getUuids)).to.be.true;
        expect(contactGetIds.calledOnceWithExactly(freetextQualifier)).to.be.true;
        expect(byFreetext.calledOnceWithExactly(freetext)).to.be.true;
      });
    });
  });
});
