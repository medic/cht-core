const sinon = require('sinon');
const auth = require('../../../src/auth');
const dataContext = require('../../../src/services/data-context');
const serverUtils = require('../../../src/server-utils');
const { Contact, Qualifier, InvalidArgumentError} = require('@medic/cht-datasource');
const {expect} = require('chai');
const controller = require('../../../src/controllers/contact');
const {PermissionError} = require('../../../src/errors');

describe('Contact Controller', () => {
  const userCtx = { hello: 'world' };
  let getUserCtx;
  let isOnlineOnly;
  let hasAllPermissions;
  let dataContextBind;
  let serverUtilsError;
  let req;
  let res;

  beforeEach(() => {
    getUserCtx = sinon
      .stub(auth, 'getUserCtx')
      .resolves(userCtx);
    isOnlineOnly = sinon.stub(auth, 'isOnlineOnly');
    hasAllPermissions = sinon.stub(auth, 'hasAllPermissions');
    dataContextBind = sinon.stub(dataContext, 'bind');
    serverUtilsError = sinon.stub(serverUtils, 'error');
    res = {
      json: sinon.stub(),
    };
  });

  afterEach(() => sinon.restore());

  describe('v1', () => {
    const privilegeError = new PermissionError('Insufficient privileges');

    describe('get', () => {
      let contactGet;
      let contactGetWithLineage;

      beforeEach(() => {
        req = {
          params: { uuid: 'uuid' },
          query: { }
        };
        contactGet = sinon.stub();
        contactGetWithLineage = sinon.stub();
        dataContextBind
          .withArgs(Contact.v1.get)
          .returns(contactGet);
        dataContextBind
          .withArgs(Contact.v1.getWithLineage)
          .returns(contactGetWithLineage);
      });

      it('returns a contact', async () => {
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        const contact = { name: 'John Doe', type: 'person' };
        contactGet.resolves(contact);

        await controller.v1.get(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.get)).to.be.true;
        expect(contactGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(contactGetWithLineage.notCalled).to.be.true;
        expect(res.json.calledOnceWithExactly(contact)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns a contact with lineage when the query parameter is set to "true"', async () => {
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        const contact = { name: 'John Doe', type: 'person' };
        contactGetWithLineage.resolves(contact);
        req.query.with_lineage = 'true';

        await controller.v1.get(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.getWithLineage)).to.be.true;
        expect(contactGet.notCalled).to.be.true;
        expect(contactGetWithLineage.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(res.json.calledOnceWithExactly(contact)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns a contact without lineage when the query parameter is set something else', async () => {
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        const contact = { name: 'John Doe', type: 'person' };
        contactGet.resolves(contact);
        req.query.with_lineage = '1';

        await controller.v1.get(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.get)).to.be.true;
        expect(contactGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(contactGetWithLineage.notCalled).to.be.true;
        expect(res.json.calledOnceWithExactly(contact)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns a 404 error if contact is not found', async () => {
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        contactGet.resolves(null);

        await controller.v1.get(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.get)).to.be.true;
        expect(contactGet.calledOnceWithExactly(Qualifier.byUuid(req.params.uuid))).to.be.true;
        expect(contactGetWithLineage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(
          { status: 404, message: 'Contact not found' },
          req,
          res
        )).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns error if user does not have can_view_contacts permission', async () => {
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(false);

        await controller.v1.get(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.notCalled).to.be.true;
        expect(contactGet.notCalled).to.be.true;
        expect(contactGetWithLineage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnce).to.be.true;
        expect(serverUtilsError.firstCall.args[0]).to.be.instanceof(PermissionError);
        expect(serverUtilsError.firstCall.args[0].message).to.equal(privilegeError.message);
        expect(serverUtilsError.firstCall.args[0].code).to.equal(privilegeError.code);
        expect(serverUtilsError.firstCall.args[1]).to.equal(req);
        expect(serverUtilsError.firstCall.args[2]).to.equal(res);
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns error if not an online user', async () => {
        isOnlineOnly.returns(false);

        await controller.v1.get(req, res);

        expect(hasAllPermissions.notCalled).to.be.true;
        expect(dataContextBind.notCalled).to.be.true;
        expect(contactGet.notCalled).to.be.true;
        expect(contactGetWithLineage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnce).to.be.true;
        expect(serverUtilsError.firstCall.args[0]).to.be.instanceof(PermissionError);
        expect(serverUtilsError.firstCall.args[0].message).to.equal(privilegeError.message);
        expect(serverUtilsError.firstCall.args[0].code).to.equal(privilegeError.code);
        expect(serverUtilsError.firstCall.args[1]).to.equal(req);
        expect(serverUtilsError.firstCall.args[2]).to.equal(res);
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });
    });

    describe('getUuids', () => {
      let contactGetUuidsPage;
      let qualifierByContactType;
      let qualifierByFreetext;
      const contactType = 'person';
      const invalidContactType = 'invalidContact';
      const freetext = 'John';
      const invalidFreetext = 'invalidFreetext';
      const contactTypeOnlyQualifier = { contactType };
      const freetextOnlyQualifier = { freetext };
      const bothQualifier = { contactType, freetext };
      const contact = { name: 'John Doe', type: contactType };
      const limit = 100;
      const cursor = null;
      const contacts = Array.from({ length: 3 }, () => ({ ...contact }));

      beforeEach(() => {
        contactGetUuidsPage = sinon.stub();
        qualifierByContactType = sinon.stub(Qualifier, 'byContactType');
        qualifierByFreetext = sinon.stub(Qualifier, 'byFreetext');
        dataContextBind.withArgs(Contact.v1.getUuidsPage).returns(contactGetUuidsPage);
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
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        contactGetUuidsPage.resolves(contacts);

        await controller.v1.getUuids(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(qualifierByContactType.calledOnceWithExactly(req.query.type)).to.be.true;
        expect(qualifierByFreetext.notCalled).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.getUuidsPage)).to.be.true;
        expect(contactGetUuidsPage.calledOnceWithExactly(contactTypeOnlyQualifier, cursor, limit)).to.be.true;
        expect(res.json.calledOnceWithExactly(contacts)).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
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
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        contactGetUuidsPage.resolves(contacts);

        await controller.v1.getUuids(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(qualifierByContactType.notCalled).to.be.true;
        expect(qualifierByFreetext.calledOnceWithExactly(req.query.freetext)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.getUuidsPage)).to.be.true;
        expect(contactGetUuidsPage.calledOnceWithExactly(freetextOnlyQualifier, cursor, limit)).to.be.true;
        expect(res.json.calledOnceWithExactly(contacts)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
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
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        contactGetUuidsPage.resolves(contacts);

        await controller.v1.getUuids(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(qualifierByContactType.calledOnceWithExactly(req.query.type)).to.be.true;
        expect(qualifierByFreetext.calledOnceWithExactly(req.query.freetext)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.getUuidsPage)).to.be.true;
        expect(contactGetUuidsPage.calledOnceWithExactly(bothQualifier, cursor, limit)).to.be.true;
        expect(res.json.calledOnceWithExactly(contacts)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns a page of contact ids with both contactType and freetext param and undefined limit', async () => {
        req = {
          query: {
            type: contactType,
            freetext,
            cursor,
          }
        };
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        contactGetUuidsPage.resolves(contacts);

        await controller.v1.getUuids(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(qualifierByContactType.calledOnceWithExactly(req.query.type)).to.be.true;
        expect(qualifierByFreetext.calledOnceWithExactly(req.query.freetext)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.getUuidsPage)).to.be.true;
        expect(contactGetUuidsPage.calledOnceWithExactly(bothQualifier, cursor, undefined)).to.be.true;
        expect(res.json.calledOnceWithExactly(contacts)).to.be.true;
        expect(serverUtilsError.notCalled).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns error in case of null limit', async () => {
        req = {
          query: {
            type: contactType,
            freetext,
            cursor,
            limit: null
          }
        };
        const err = new InvalidArgumentError(`The limit must be a positive integer: [NaN].`);
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        contactGetUuidsPage.throws(err);

        await controller.v1.getUuids(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(qualifierByContactType.calledOnceWithExactly(req.query.type)).to.be.true;
        expect(qualifierByFreetext.calledOnceWithExactly(req.query.freetext)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.getUuidsPage)).to.be.true;
        expect(contactGetUuidsPage.calledOnceWithExactly(bothQualifier, cursor, null)).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(err, req, res)).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns error if user does not have can_view_contacts permission', async () => {
        req = {
          query: {
            type: contactType,
            freetext,
            cursor,
            limit,
          }
        };
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(false);

        await controller.v1.getUuids(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(dataContextBind.notCalled).to.be.true;
        expect(qualifierByContactType.notCalled).to.be.true;
        expect(qualifierByFreetext.notCalled).to.be.true;
        expect(contactGetUuidsPage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnce).to.be.true;
        expect(serverUtilsError.firstCall.args[0]).to.be.instanceof(PermissionError);
        expect(serverUtilsError.firstCall.args[0].message).to.equal(privilegeError.message);
        expect(serverUtilsError.firstCall.args[0].code).to.equal(privilegeError.code);
        expect(serverUtilsError.firstCall.args[1]).to.equal(req);
        expect(serverUtilsError.firstCall.args[2]).to.equal(res);
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns error if not an online user', async () => {
        req = {
          query: {
            type: contactType,
            freetext,
            cursor,
            limit,
          }
        };
        isOnlineOnly.returns(false);

        await controller.v1.getUuids(req, res);

        expect(hasAllPermissions.notCalled).to.be.true;
        expect(dataContextBind.notCalled).to.be.true;
        expect(qualifierByContactType.notCalled).to.be.true;
        expect(qualifierByFreetext.notCalled).to.be.true;
        expect(contactGetUuidsPage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnce).to.be.true;
        expect(serverUtilsError.firstCall.args[0]).to.be.instanceof(PermissionError);
        expect(serverUtilsError.firstCall.args[0].message).to.equal(privilegeError.message);
        expect(serverUtilsError.firstCall.args[0].code).to.equal(privilegeError.code);
        expect(serverUtilsError.firstCall.args[1]).to.equal(req);
        expect(serverUtilsError.firstCall.args[2]).to.equal(res);
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns 400 error when contactType is invalid', async () => {
        req = {
          query: {
            type: invalidContactType,
            cursor,
            limit,
          }
        };
        const err = new InvalidArgumentError(`Invalid contact type: [${invalidContactType}]`);
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        contactGetUuidsPage.throws(err);

        await controller.v1.getUuids(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(qualifierByContactType.calledOnceWithExactly(req.query.type)).to.be.true;
        expect(qualifierByFreetext.notCalled).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.getUuidsPage)).to.be.true;
        expect(contactGetUuidsPage.calledOnceWithExactly(contactTypeOnlyQualifier, cursor, limit)).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(err, req, res)).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns 400 error when freetext is invalid', async () => {
        req = {
          query: {
            freetext: invalidFreetext,
            cursor,
            limit,
          }
        };
        const err = new InvalidArgumentError(`Invalid freetext: [${invalidFreetext}]`);
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        contactGetUuidsPage.throws(err);

        await controller.v1.getUuids(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(qualifierByContactType.notCalled).to.be.true;
        expect(qualifierByFreetext.calledOnceWithExactly(req.query.freetext)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.getUuidsPage)).to.be.true;
        expect(contactGetUuidsPage.calledOnceWithExactly(freetextOnlyQualifier, cursor, limit)).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(err, req, res)).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('returns 400 error when contactType AND freetext is not present', async () => {
        req = {
          query: {
            cursor,
            limit,
          }
        };
        const err = { status: 400, message: 'Either query param freetext or type is required' };
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        contactGetUuidsPage.throws(err);

        await controller.v1.getUuids(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(qualifierByContactType.notCalled).to.be.true;
        expect(qualifierByFreetext.notCalled).to.be.true;
        expect(dataContextBind.notCalled).to.be.true;
        expect(contactGetUuidsPage.notCalled).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(err, req, res)).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });

      it('rethrows error in case of other errors', async () => {
        req = {
          query: {
            freetext: freetext,
            type: contactType,
            cursor,
            limit,
          }
        };
        const err = new Error('error');
        isOnlineOnly.returns(true);
        hasAllPermissions.returns(true);
        contactGetUuidsPage.throws(err);

        await controller.v1.getUuids(req, res);

        expect(hasAllPermissions.calledOnceWithExactly(userCtx, 'can_view_contacts')).to.be.true;
        expect(qualifierByContactType.calledOnceWithExactly(req.query.type)).to.be.true;
        expect(qualifierByFreetext.calledOnceWithExactly(req.query.freetext)).to.be.true;
        expect(dataContextBind.calledOnceWithExactly(Contact.v1.getUuidsPage)).to.be.true;
        expect(contactGetUuidsPage.calledOnceWithExactly(bothQualifier, cursor, limit)).to.be.true;
        expect(res.json.notCalled).to.be.true;
        expect(serverUtilsError.calledOnceWithExactly(err, req, res)).to.be.true;
        expect(getUserCtx.calledOnceWithExactly(req)).to.be.true;
        expect(isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      });
    });
  });
});
