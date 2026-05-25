const sinon = require('sinon');
const auth = require('../../../src/auth');
const dataContext = require('../../../src/services/data-context');
const serverUtils = require('../../../src/server-utils');
const { Contact, Qualifier } = require('@medic/cht-datasource');
const {expect} = require('chai');

describe('Contact Controller', () => {
  const sandbox = sinon.createSandbox();
  const contactGet = sandbox.stub();
  const contactGetWithLineage = sandbox.stub();
  const contactGetUuidsPage = sandbox.stub();

  let assertPermissions;
  let serverUtilsError;
  let req;
  let res;
  let controller;

  before(() => {
    const bind = sinon.stub(dataContext, 'bind');
    bind.withArgs(Contact.v1.get).returns(contactGet);
    bind.withArgs(Contact.v1.getWithLineage).returns(contactGetWithLineage);
    bind.withArgs(Contact.v1.getUuidsPage).returns(contactGetUuidsPage);
    controller = require('../../../src/controllers/contact');
  });

  beforeEach(() => {
    assertPermissions = sinon.stub(auth, 'assertPermissions').resolves();
    serverUtilsError = sinon.stub(serverUtils, 'error');
    res = {
      json: sinon.stub(),
    };
  });

  afterEach(() => {
    sinon.restore();
    sandbox.reset();
  });

  describe('v1', () => {
    describe('get', () => {
      beforeEach(() => {
        req = {
          params: { uuid: 'uuid' },
          query: { }
        };
      });

      it('returns a contact', async () => {
        const contact = { name: 'John Doe', type: 'person' };
        contactGet.resolves(contact);

        await controller.v1.get(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_contacts'] }
        )).to.be.true;
        expect(contactGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(contactGetWithLineage.notCalled).to.be.true;
        expect(res.json.calledOnceWithExactly(contact)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a contact with lineage when the query parameter is set to "true"', async () => {
        const contact = { name: 'John Doe', type: 'person' };
        contactGetWithLineage.resolves(contact);
        req.query.with_lineage = 'true';

        await controller.v1.get(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_contacts'] }
        )).to.be.true;
        expect(contactGet.notCalled).to.be.true;
        expect(contactGetWithLineage.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(res.json.calledOnceWithExactly(contact)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a contact without lineage when the query parameter is set something else', async () => {
        const contact = { name: 'John Doe', type: 'person' };
        contactGet.resolves(contact);
        req.query.with_lineage = '1';

        await controller.v1.get(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_contacts'] }
        )).to.be.true;
        expect(contactGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(contactGetWithLineage.notCalled).to.be.true;
        expect(res.json.calledOnceWithExactly(contact)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a 404 error if contact is not found', async () => {
        contactGet.resolves(null);

        await controller.v1.get(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_contacts'] }
        )).to.be.true;
        expect(contactGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(contactGetWithLineage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(
          { status: 404, message: 'Contact not found' },
          req,
          res
        )).to.be.true;
      });
    });

    describe('getUuids', () => {
      let qualifierByContactType;
      let qualifierByFreetext;
      const contactType = 'person';
      const freetext = 'John';
      const contactTypeOnlyQualifier = { contactType };
      const freetextOnlyQualifier = { freetext };
      const bothQualifier = { contactType, freetext };
      const contact = { name: 'John Doe', type: contactType };
      const limit = 100;
      const cursor = null;
      const contacts = Array.from({ length: 3 }, () => ({ ...contact }));

      beforeEach(() => {
        qualifierByContactType = sinon.stub(Qualifier, 'byContactType');
        qualifierByFreetext = sinon.stub(Qualifier, 'byFreetext');
        qualifierByContactType.returns(contactTypeOnlyQualifier);
        qualifierByFreetext.returns(freetextOnlyQualifier);
      });

      it('returns a page of contact ids with contact type param only', async () => {
        req = {
          query: {
            type: contactType,
            cursor,
            limit,
          }
        };
        contactGetUuidsPage.resolves(contacts);

        await controller.v1.getUuids(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_contacts'] }
        )).to.be.true;
        expect(qualifierByContactType.calledOnceWithExactly(req.query.type)).to.be.true;
        expect(qualifierByFreetext.notCalled).to.be.true;
        expect(contactGetUuidsPage.calledOnceWithExactly(contactTypeOnlyQualifier, cursor, limit)).to.be.true;
        expect(res.json.calledOnceWithExactly(contacts)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a page of contact ids with freetext param only', async () => {
        req = {
          query: {
            freetext,
            cursor,
            limit,
          }
        };
        contactGetUuidsPage.resolves(contacts);

        await controller.v1.getUuids(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_contacts'] }
        )).to.be.true;
        expect(qualifierByContactType.notCalled).to.be.true;
        expect(qualifierByFreetext.calledOnceWithExactly(req.query.freetext)).to.be.true;
        expect(contactGetUuidsPage.calledOnceWithExactly(freetextOnlyQualifier, cursor, limit)).to.be.true;
        expect(res.json.calledOnceWithExactly(contacts)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a page of contact ids with both contactType and freetext param', async () => {
        req = {
          query: {
            type: contactType,
            freetext,
            cursor,
            limit,
          }
        };
        contactGetUuidsPage.resolves(contacts);

        await controller.v1.getUuids(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_contacts'] }
        )).to.be.true;
        expect(qualifierByContactType.calledOnceWithExactly(req.query.type)).to.be.true;
        expect(qualifierByFreetext.calledOnceWithExactly(req.query.freetext)).to.be.true;
        expect(contactGetUuidsPage.calledOnceWithExactly(bothQualifier, cursor, limit)).to.be.true;
        expect(res.json.calledOnceWithExactly(contacts)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns a page of contact ids with both contactType and freetext param and undefined limit', async () => {
        req = {
          query: {
            type: contactType,
            freetext,
            cursor,
          }
        };
        contactGetUuidsPage.resolves(contacts);

        await controller.v1.getUuids(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_contacts'] }
        )).to.be.true;
        expect(qualifierByContactType.calledOnceWithExactly(req.query.type)).to.be.true;
        expect(qualifierByFreetext.calledOnceWithExactly(req.query.freetext)).to.be.true;
        expect(contactGetUuidsPage.calledOnceWithExactly(bothQualifier, cursor, undefined)).to.be.true;
        expect(res.json.calledOnceWithExactly(contacts)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
      });

      it('returns 400 error when no qualifier param is present', async () => {
        req = {
          query: {
            cursor,
            limit,
          }
        };

        await controller.v1.getUuids(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_contacts'] }
        )).to.be.true;
        expect(qualifierByContactType.notCalled).to.be.true;
        expect(qualifierByFreetext.notCalled).to.be.true;
        expect(contactGetUuidsPage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(
          { status: 400, message: 'At least one of query params type, freetext, phone is required' },
          req,
          res
        )).to.be.true;
      });

      describe('phone query param', () => {
        const phone = '+15551234567';
        const phoneOnlyQualifier = { phone };
        let qualifierByPhone;

        beforeEach(() => {
          qualifierByPhone = sinon.stub(Qualifier, 'byPhone').returns(phoneOnlyQualifier);
        });

        it('builds a phone qualifier when phone is the only qualifier', async () => {
          req = { query: { phone, cursor, limit } };
          const expected = { data: ['uuid-1'], cursor: 'next' };
          contactGetUuidsPage.resolves(expected);

          await controller.v1.getUuids(req, res);

          expect(qualifierByPhone.calledOnceWithExactly(phone)).to.be.true;
          expect(qualifierByContactType.notCalled).to.be.true;
          expect(qualifierByFreetext.notCalled).to.be.true;
          expect(contactGetUuidsPage.calledOnceWithExactly(phoneOnlyQualifier, cursor, limit)).to.be.true;
          expect(res.json.calledOnceWithExactly(expected)).to.be.true;
        });

        [
          [{ type: contactType, phone }, 'type, phone'],
          [{ freetext, phone }, 'freetext, phone'],
          [{ type: contactType, freetext, phone }, 'type, freetext, phone'],
        ].forEach(([query, presentList]) => {
          it(`returns 400 when phone is combined with ${Object.keys(query).filter(k => k !== 'phone').join('/')}`,
            async () => {
              req = { query: { ...query, cursor, limit } };

              await controller.v1.getUuids(req, res);

              expect(qualifierByPhone.notCalled).to.be.true;
              expect(qualifierByContactType.notCalled).to.be.true;
              expect(qualifierByFreetext.notCalled).to.be.true;
              expect(contactGetUuidsPage.notCalled).to.be.true;
              expect(res.json.notCalled).to.be.true;
              expect(serverUtilsError.calledOnceWithExactly(
                {
                  status: 400,
                  message: `Query params ${presentList} are mutually exclusive `
                    + '(only type and freetext may be combined)',
                },
                req,
                res
              )).to.be.true;
            });
        });

        it('walks two cursor pages with limit 5', async () => {
          const firstPage = { data: ['a', 'b', 'c', 'd', 'e'], cursor: '5' };
          const secondPage = { data: ['f'], cursor: null };
          contactGetUuidsPage.onFirstCall().resolves(firstPage);
          contactGetUuidsPage.onSecondCall().resolves(secondPage);

          await controller.v1.getUuids({ query: { phone, cursor: null, limit: 5 } }, res);
          expect(contactGetUuidsPage.firstCall.args).to.deep.equal([phoneOnlyQualifier, null, 5]);
          expect(res.json.calledWith(firstPage)).to.be.true;

          await controller.v1.getUuids({ query: { phone, cursor: '5', limit: 5 } }, res);
          expect(contactGetUuidsPage.secondCall.args).to.deep.equal([phoneOnlyQualifier, '5', 5]);
          expect(res.json.calledWith(secondPage)).to.be.true;
        });
      });
    });

    describe('postUuids (bulk)', () => {
      const phones = ['+15551234567', '+15559999999'];
      const phonesQualifier = { phones };
      const cursor = null;
      const limit = 100;
      let qualifierByPhones;

      beforeEach(() => {
        qualifierByPhones = sinon.stub(Qualifier, 'byPhones').returns(phonesQualifier);
      });

      it('builds a phones qualifier from the JSON body', async () => {
        req = { body: { phones, cursor, limit } };
        const expected = { data: ['uuid-1', 'uuid-2'], cursor: 'next' };
        contactGetUuidsPage.resolves(expected);

        await controller.v1.postUuids(req, res);

        expect(assertPermissions.calledOnceWithExactly(
          req,
          { isOnline: true, hasAll: ['can_view_contacts'] }
        )).to.be.true;
        expect(qualifierByPhones.calledOnceWithExactly(phones)).to.be.true;
        expect(contactGetUuidsPage.calledOnceWithExactly(phonesQualifier, cursor, limit)).to.be.true;
        expect(res.json.calledOnceWithExactly(expected)).to.be.true;
      });

      it('returns 400 when the body has no qualifier param', async () => {
        req = { body: { cursor, limit } };

        await controller.v1.postUuids(req, res);

        expect(qualifierByPhones.notCalled).to.be.true;
        expect(contactGetUuidsPage.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(
          { status: 400, message: 'At least one of body params phones is required' },
          req,
          res
        )).to.be.true;
      });

      it('walks two cursor pages with limit 5', async () => {
        const firstPage = { data: ['a', 'b', 'c', 'd', 'e'], cursor: '5' };
        const secondPage = { data: ['f'], cursor: null };
        contactGetUuidsPage.onFirstCall().resolves(firstPage);
        contactGetUuidsPage.onSecondCall().resolves(secondPage);

        await controller.v1.postUuids({ body: { phones, cursor: null, limit: 5 } }, res);
        expect(contactGetUuidsPage.firstCall.args).to.deep.equal([phonesQualifier, null, 5]);
        expect(res.json.calledWith(firstPage)).to.be.true;

        await controller.v1.postUuids({ body: { phones, cursor: '5', limit: 5 } }, res);
        expect(contactGetUuidsPage.secondCall.args).to.deep.equal([phonesQualifier, '5', 5]);
        expect(res.json.calledWith(secondPage)).to.be.true;
      });
    });
  });
});
