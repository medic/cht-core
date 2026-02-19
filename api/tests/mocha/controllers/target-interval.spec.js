const sinon = require('sinon');
const {expect} = require('chai');
const dataContext = require('../../../src/services/data-context');
const auth = require('../../../src/auth');
const serverUtils = require('../../../src/server-utils');
const { Qualifier, Target, InvalidArgumentError } = require('@medic/cht-datasource');

const target = Object.freeze({ uuid: 'abc-123', name: 'interval' });
const target1 = Object.freeze({ uuid: 'abc-124', name: 'interval1' });
const target2 = Object.freeze({ uuid: 'abc-125', name: 'interval2' });
const userCtx = Object.freeze({ name: 'user' });

describe('Target controller', () => {
  const sandbox = sinon.createSandbox();

  let res;
  let req;
  let controller;
  let getTarget;
  let getTargets;

  before(() => {
    getTarget = sandbox.stub();
    getTargets = sandbox.stub();
    const bind = sinon.stub(dataContext, 'bind');
    bind.withArgs(Target.v1.get).returns(getTarget);
    bind.withArgs(Target.v1.getPage).returns(getTargets);

    controller = require('../../../src/controllers/target-interval');
  });

  beforeEach(() => {
    res = { json: sinon.stub() };

    sinon.stub(serverUtils, 'error');
    sinon.stub(auth, 'getUserCtx').resolves(userCtx);
    sinon.stub(auth, 'isOnlineOnly').returns(true);
  });

  afterEach(() => {
    sinon.restore();
    sandbox.reset();
  });

  describe('v1', () => {
    describe('get', () => {
      const uuid = 'abc-123';

      beforeEach(() => {
        req = { params: { uuid } };
      });

      it('responds with json when target is found', async () => {
        auth.isOnlineOnly.returns(true);
        getTarget.resolves(target);

        await controller.v1.get(req, res);

        expect(serverUtils.error).to.not.have.been.called;
        expect(auth.getUserCtx).to.have.been.calledOnceWithExactly(req);
        expect(auth.isOnlineOnly).to.have.been.calledOnceWithExactly(userCtx);
        expect(getTarget).to.have.been.calledOnceWithExactly(Qualifier.byUuid(uuid));
        expect(res.json).to.have.been.calledOnceWithExactly(target);
      });


      it('returns 403 when user is not online-only', async () => {
        auth.isOnlineOnly.returns(false);

        await controller.v1.get(req, res);

        expect(serverUtils.error).to.have.been.calledOnce;
        const [[err, eReq]] = serverUtils.error.args;
        expect(err).to.include({ message: 'Insufficient privileges', code: 403 });
        expect(eReq).to.equal(req);
        expect(auth.getUserCtx).to.have.been.calledOnceWithExactly(req);
        expect(auth.isOnlineOnly).to.have.been.calledOnceWithExactly(userCtx);
        expect(getTarget).to.not.have.been.called;
        expect(res.json).to.not.have.been.called;
      });

      it('returns 404 when target not found', async () => {
        auth.isOnlineOnly.returns(true);
        getTarget.resolves(null);

        await controller.v1.get(req, res);

        expect(serverUtils.error).to.have.been.calledOnceWithExactly(
          { status: 404, message: 'Target not found' },
          req,
          res
        );
        expect(auth.getUserCtx).to.have.been.calledOnceWithExactly(req);
        expect(auth.isOnlineOnly).to.have.been.calledOnceWithExactly(userCtx);
        expect(getTarget).to.have.been.calledOnceWithExactly(Qualifier.byUuid(uuid));
        expect(res.json).to.not.have.been.called;
      });
    });

    describe('getAll', () => {
      beforeEach(() => {
        req = { query: {} };
      });

      it('responds with json when targets are found for multiple contact UUIDs', async () => {
        auth.isOnlineOnly.returns(true);
        req.query = {
          contact_uuids: 'contact1,contact2',
          reporting_period: '2024-01',
          cursor: 'cursor123',
          limit: '10'
        };
        const expectedPage = { data: [target, target1, target2], cursor: '3' };
        getTargets.resolves(expectedPage);

        await controller.v1.getAll(req, res);

        expect(serverUtils.error).to.not.have.been.called;
        expect(auth.getUserCtx).to.have.been.calledOnceWithExactly(req);
        expect(auth.isOnlineOnly).to.have.been.calledOnceWithExactly(userCtx);
        expect(getTargets).to.have.been.calledOnceWithExactly(
          Qualifier.and(
            Qualifier.byContactUuids(['contact1', 'contact2']),
            Qualifier.byReportingPeriod('2024-01')
          ),
          'cursor123',
          '10'
        );
        expect(res.json).to.have.been.calledOnceWithExactly(expectedPage);
      });

      it('responds with json when targets are found for single contact UUID', async () => {
        auth.isOnlineOnly.returns(true);
        req.query = {
          contact_uuid: 'contact1',
          reporting_period: '2024-01',
          cursor: 'cursor123',
          limit: '10'
        };
        const expectedPage = { data: [target], cursor: null };
        getTargets.resolves(expectedPage);

        await controller.v1.getAll(req, res);

        expect(serverUtils.error).to.not.have.been.called;
        expect(auth.getUserCtx).to.have.been.calledOnceWithExactly(req);
        expect(auth.isOnlineOnly).to.have.been.calledOnceWithExactly(userCtx);
        expect(getTargets).to.have.been.calledOnceWithExactly(
          Qualifier.and(
            Qualifier.byContactUuid('contact1'),
            Qualifier.byReportingPeriod('2024-01')
          ),
          'cursor123',
          '10'
        );
        expect(res.json).to.have.been.calledOnceWithExactly(expectedPage);
      });

      it('returns 403 when user is not online-only', async () => {
        auth.isOnlineOnly.returns(false);

        await controller.v1.getAll(req, res);

        expect(serverUtils.error).to.have.been.calledOnce;
        const [[err, eReq]] = serverUtils.error.args;
        expect(err).to.include({ message: 'Insufficient privileges', code: 403 });
        expect(eReq).to.equal(req);
        expect(auth.getUserCtx).to.have.been.calledOnceWithExactly(req);
        expect(auth.isOnlineOnly).to.have.been.calledOnceWithExactly(userCtx);
        expect(getTargets).to.not.have.been.called;
        expect(res.json).to.not.have.been.called;
      });

      [
        '',
        ',',
        undefined
      ].forEach(contact_uuids => {
        it('fails when an invalid contact_uuids query parameter is provided', async () => {
          auth.isOnlineOnly.returns(true);
          req.query = {
            contact_uuids,
            reporting_period: '2024-01'
          };

          await controller.v1.getAll(req, res);

          expect(serverUtils.error).to.have.been.calledOnce;
          const [[err, eReq]] = serverUtils.error.args;
          expect(err).to.be.an.instanceof(InvalidArgumentError);
          expect(eReq).to.equal(req);
          expect(auth.getUserCtx).to.have.been.calledOnceWithExactly(req);
          expect(auth.isOnlineOnly).to.have.been.calledOnceWithExactly(userCtx);
          expect(getTargets).to.not.have.been.called;
          expect(res.json).to.not.have.been.called;
        });
      });

      it('fails when no reporting_period query parameter is provided', async () => {
        auth.isOnlineOnly.returns(true);
        req.query = {
          contact_uuids: 'contact1,contact2',
        };

        await controller.v1.getAll(req, res);

        expect(serverUtils.error).to.have.been.calledOnce;
        const [[err, eReq]] = serverUtils.error.args;
        expect(err).to.be.an.instanceof(InvalidArgumentError);
        expect(eReq).to.equal(req);
        expect(auth.getUserCtx).to.have.been.calledOnceWithExactly(req);
        expect(auth.isOnlineOnly).to.have.been.calledOnceWithExactly(userCtx);
        expect(getTargets).to.not.have.been.called;
        expect(res.json).to.not.have.been.called;
      });

      it('handles all optional query parameters missing', async () => {
        auth.isOnlineOnly.returns(true);
        req.query = {
          contact_uuids: 'contact1,contact2',
          reporting_period: '2024-01',
        };
        const expectedPage = { data: [target, target1, target2], cursor: '3' };
        getTargets.resolves(expectedPage);

        await controller.v1.getAll(req, res);

        expect(serverUtils.error).to.not.have.been.called;
        expect(auth.getUserCtx).to.have.been.calledOnceWithExactly(req);
        expect(auth.isOnlineOnly).to.have.been.calledOnceWithExactly(userCtx);
        expect(getTargets).to.have.been.calledOnceWithExactly(
          Qualifier.and(
            Qualifier.byContactUuids(['contact1', 'contact2']),
            Qualifier.byReportingPeriod('2024-01')
          ),
          undefined, // NOSONAR
          undefined
        );
        expect(res.json).to.have.been.calledOnceWithExactly(expectedPage);
      });
    });
  });
});
