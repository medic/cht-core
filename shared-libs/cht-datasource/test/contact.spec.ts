import { DataContext } from '../src';
import sinon, { SinonStub } from 'sinon';
import * as Context from '../src/libs/data-context';
import * as Local from '../src/local';
import * as Remote from '../src/remote';
import * as Qualifier from '../src/qualifier';
import * as Contact from '../src/contact';
import { expect } from 'chai';
import * as Core from '../src/libs/core';

describe('contact', () => {
  const dataContext = { } as DataContext;
  let assertDataContext: SinonStub;
  let adapt: SinonStub;
  let isUuidQualifier: SinonStub;
  let isContactTypeQualifier: SinonStub;
  let isFreetextQualifier: SinonStub;

  beforeEach(() => {
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

    describe('getUuidsPage', () => {
      const contactIds = ['contact1', 'contact2', 'contact3'] as string[];
      const cursor = '1';
      const pageData = { data: contactIds, cursor };
      const limit = 3;
      const stringifiedLimit = '3';
      const contactTypeQualifier = { contactType: 'person' } as const;
      const freetextQualifier = { freetext: 'freetext' } as const;
      const qualifier = {
        ...contactTypeQualifier,
        ...freetextQualifier,
      };
      const invalidContactTypeQualifier = { contactType: 'invalidContactType' } as const;
      const invalidFreetextQualifier = { freetext: 'invalidFreetext' } as const;
      const invalidQualifier = {
        ...invalidContactTypeQualifier,
        ...invalidFreetextQualifier,
      };
      let getIdsPage: SinonStub;

      beforeEach(() => {
        getIdsPage = sinon.stub();
        adapt.returns(getIdsPage);
      });

      it('retrieves contact id page from the data context when cursor is null', async () => {
        isContactTypeQualifier.returns(true);
        isFreetextQualifier.returns(true);
        getIdsPage.resolves(pageData);

        const result = await Contact.v1.getUuidsPage(dataContext)(qualifier, null, limit);

        expect(result).to.equal(pageData);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(
          adapt.calledOnceWithExactly(dataContext, Local.Contact.v1.getUuidsPage, Remote.Contact.v1.getUuidsPage)
        ).to.be.true;
        expect(getIdsPage.calledOnceWithExactly(qualifier, null, limit)).to.be.true;
        expect(isContactTypeQualifier.calledOnceWithExactly(qualifier)).to.be.true;
        expect(isFreetextQualifier.notCalled).to.be.true;
      });

      it('retrieves contact id page from the data context when cursor is not null', async () => {
        isContactTypeQualifier.returns(true);
        isFreetextQualifier.returns(true);
        getIdsPage.resolves(pageData);

        const result = await Contact.v1.getUuidsPage(dataContext)(qualifier, cursor, limit);

        expect(result).to.equal(pageData);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(
          adapt.calledOnceWithExactly(dataContext, Local.Contact.v1.getUuidsPage, Remote.Contact.v1.getUuidsPage)
        ).to.be.true;
        expect(getIdsPage.calledOnceWithExactly(qualifier, cursor, limit)).to.be.true;
        expect(isContactTypeQualifier.calledOnceWithExactly(qualifier)).to.be.true;
        expect(isFreetextQualifier.notCalled).to.be.true;
      });

      it('retrieves contact id page from the data context when cursor is not null and ' +
        'limit is stringified number', async () => {
        isContactTypeQualifier.returns(true);
        isFreetextQualifier.returns(true);
        getIdsPage.resolves(pageData);

        const result = await Contact.v1.getUuidsPage(dataContext)(qualifier, cursor, stringifiedLimit);

        expect(result).to.equal(pageData);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(
          adapt.calledOnceWithExactly(dataContext, Local.Contact.v1.getUuidsPage, Remote.Contact.v1.getUuidsPage)
        ).to.be.true;
        expect(getIdsPage.calledOnceWithExactly(qualifier, cursor, limit)).to.be.true;
        expect(isContactTypeQualifier.calledOnceWithExactly(qualifier)).to.be.true;
        expect(isFreetextQualifier.notCalled).to.be.true;
      });

      it('throws an error if the data context is invalid', () => {
        isContactTypeQualifier.returns(true);
        isFreetextQualifier.returns(true);
        assertDataContext.throws(new Error(`Invalid data context [null].`));

        expect(() => Contact.v1.getUuidsPage(dataContext)).to.throw(`Invalid data context [null].`);

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(adapt.notCalled).to.be.true;
        expect(getIdsPage.notCalled).to.be.true;
        expect(isContactTypeQualifier.notCalled).to.be.true;
        expect(isFreetextQualifier.notCalled).to.be.true;
      });

      it('throws an error if the contact type qualifier is invalid', async () => {
        isContactTypeQualifier.returns(false);

        await expect(Contact.v1.getUuidsPage(dataContext)(invalidContactTypeQualifier, cursor, limit))
          .to.be.rejectedWith(`Invalid qualifier [${JSON.stringify(invalidContactTypeQualifier)}]. ` +
            `Must be a contact type and/or freetext qualifier.`);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(
          adapt.calledOnceWithExactly(dataContext, Local.Contact.v1.getUuidsPage, Remote.Contact.v1.getUuidsPage)
        ).to.be.true;
        expect(isContactTypeQualifier.calledOnceWithExactly(invalidContactTypeQualifier)).to.be.true;
        expect(isFreetextQualifier.calledOnceWithExactly(invalidContactTypeQualifier)).to.be.true;
        expect(getIdsPage.notCalled).to.be.true;
      });

      it('throws an error if the freetext type qualifier is invalid', async () => {
        isFreetextQualifier.returns(false);

        await expect(Contact.v1.getUuidsPage(dataContext)(invalidFreetextQualifier, cursor, limit))
          .to.be.rejectedWith(`Invalid qualifier [${JSON.stringify(invalidFreetextQualifier)}]. ` +
            `Must be a contact type and/or freetext qualifier.`);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(
          adapt.calledOnceWithExactly(dataContext, Local.Contact.v1.getUuidsPage, Remote.Contact.v1.getUuidsPage)
        ).to.be.true;
        expect(isContactTypeQualifier.calledOnceWithExactly(invalidFreetextQualifier)).to.be.true;
        expect(isFreetextQualifier.calledOnceWithExactly(invalidFreetextQualifier)).to.be.true;
        expect(getIdsPage.notCalled).to.be.true;
      });

      it('throws an error if the qualifier is invalid for both contact type and freetext', async () => {
        isContactTypeQualifier.returns(false);
        isFreetextQualifier.returns(false);

        await expect(Contact.v1.getUuidsPage(dataContext)(invalidQualifier, cursor, limit)).to.be.rejectedWith(
          `Invalid qualifier [${JSON.stringify(invalidQualifier)}]. Must be a contact type and/or freetext qualifier.`
        );

        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(
          adapt.calledOnceWithExactly(dataContext, Local.Contact.v1.getUuidsPage, Remote.Contact.v1.getUuidsPage)
        ).to.be.true;
        expect(isContactTypeQualifier.calledOnceWithExactly(invalidQualifier)).to.be.true;
        expect(isFreetextQualifier.calledOnceWithExactly(invalidQualifier)).to.be.true;
        expect(getIdsPage.notCalled).to.be.true;
      });

      [
        -1,
        null,
        {},
        '',
        0,
        1.1,
        false
      ].forEach((limitValue) => {
        it(`throws an error if limit is invalid: ${JSON.stringify(limitValue)}`, async () => {
          isContactTypeQualifier.returns(true);
          getIdsPage.resolves(pageData);

          await expect(Contact.v1.getUuidsPage(dataContext)(qualifier, cursor, limitValue as number))
            .to.be.rejectedWith(`The limit must be a positive integer: [${JSON.stringify(limitValue)}]`);

          expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
          expect(
            adapt.calledOnceWithExactly(dataContext, Local.Contact.v1.getUuidsPage, Remote.Contact.v1.getUuidsPage)
          ).to.be.true;
          expect(isContactTypeQualifier.notCalled).to.be.true;
          expect(isFreetextQualifier.notCalled).to.be.true;
          expect(getIdsPage.notCalled).to.be.true;
        });
      });

      [
        {},
        '',
        1,
        false,
      ].forEach((skipValue) => {
        it('throws an error if cursor is invalid', async () => {
          isContactTypeQualifier.returns(true);
          getIdsPage.resolves(pageData);

          await expect(Contact.v1.getUuidsPage(dataContext)(qualifier, skipValue as string, limit))
            .to.be.rejectedWith(`The cursor must be a string or null for first page: [${JSON.stringify(skipValue)}]`);

          expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
          expect(
            adapt.calledOnceWithExactly(dataContext, Local.Contact.v1.getUuidsPage, Remote.Contact.v1.getUuidsPage)
          ).to.be.true;
          expect(isContactTypeQualifier.notCalled).to.be.true;
          expect(isFreetextQualifier.notCalled).to.be.true;
          expect(getIdsPage.notCalled).to.be.true;
        });
      });
    });

    describe('getUuids', () => {
      const contactTypeQualifier = { contactType: 'person' } as const;
      const freetextQualifier = { freetext: 'freetext' } as const;
      const qualifier = {
        ...contactTypeQualifier,
        ...freetextQualifier,
      };
      const invalidContactTypeQualifier = { contactType: 'invalidContactType' } as const;
      const invalidFreetextQualifier = { freetext: 'invalidFreetext' } as const;
      const invalidQualifier = {
        ...invalidContactTypeQualifier,
        ...invalidFreetextQualifier
      };
      const mockGenerator = {} as Generator<string, void>;
      let contactGetIdsPage: sinon.SinonStub;
      let getPagedGenerator: sinon.SinonStub;

      beforeEach(() => {
        contactGetIdsPage = sinon.stub(Contact.v1, 'getUuidsPage');
        dataContext.bind = sinon.stub().returns(contactGetIdsPage);
        getPagedGenerator = sinon.stub(Core, 'getPagedGenerator');
      });

      it('should get contact generator with correct parameters', () => {
        isContactTypeQualifier.returns(true);
        isFreetextQualifier.returns(true);
        getPagedGenerator.returns(mockGenerator);

        const generator = Contact.v1.getUuids(dataContext)(qualifier);

        expect(generator).to.deep.equal(mockGenerator);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(getPagedGenerator.calledOnceWithExactly(contactGetIdsPage, qualifier)).to.be.true;
        expect(isContactTypeQualifier.calledOnceWithExactly(qualifier)).to.be.true;
        expect(isFreetextQualifier.notCalled).to.be.true;
      });

      it('should throw an error for invalid datacontext', () => {
        const errMsg = 'Invalid data context [null].';
        isContactTypeQualifier.returns(true);
        isFreetextQualifier.returns(true);
        assertDataContext.throws(new Error(errMsg));

        expect(() => Contact.v1.getUuids(dataContext)).to.throw(errMsg);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(contactGetIdsPage.notCalled).to.be.true;
        expect(isContactTypeQualifier.notCalled).to.be.true;
        expect(isFreetextQualifier.notCalled).to.be.true;
      });

      it('should throw an error for invalid contactType', () => {
        isContactTypeQualifier.returns(false);

        expect(() => Contact.v1.getUuids(dataContext)(invalidContactTypeQualifier))
          .to.throw(`Invalid qualifier [${JSON.stringify(invalidContactTypeQualifier)}]. ` +
          `Must be a contact type and/or freetext qualifier.`);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(contactGetIdsPage.notCalled).to.be.true;
        expect(isContactTypeQualifier.calledOnceWithExactly(invalidContactTypeQualifier)).to.be.true;
        expect(isFreetextQualifier.calledOnceWithExactly(invalidContactTypeQualifier)).to.be.true;
      });

      it('should throw an error for invalid freetext', () => {
        isFreetextQualifier.returns(false);

        expect(() => Contact.v1.getUuids(dataContext)(invalidFreetextQualifier))
          .to.throw(`Invalid qualifier [${JSON.stringify(invalidFreetextQualifier)}]. ` +
          `Must be a contact type and/or freetext qualifier.`);
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(contactGetIdsPage.notCalled).to.be.true;
        expect(isContactTypeQualifier.calledOnceWithExactly(invalidFreetextQualifier)).to.be.true;
        expect(isFreetextQualifier.calledOnceWithExactly(invalidFreetextQualifier)).to.be.true;
      });

      it('should throw an error for both invalid contactType and freetext', () => {
        isContactTypeQualifier.returns(false);
        isFreetextQualifier.returns(false);

        expect(() => Contact.v1.getUuids(dataContext)(invalidQualifier)).to.throw(
          `Invalid qualifier [${JSON.stringify(invalidQualifier)}]. Must be a contact type and/or freetext qualifier.`
        );
        expect(assertDataContext.calledOnceWithExactly(dataContext)).to.be.true;
        expect(contactGetIdsPage.notCalled).to.be.true;
        expect(isContactTypeQualifier.calledOnceWithExactly(invalidQualifier)).to.be.true;
        expect(isFreetextQualifier.calledOnceWithExactly(invalidQualifier)).to.be.true;
      });
    });
  });
});
