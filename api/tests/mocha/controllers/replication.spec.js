const { expect } = require('chai');
const sinon = require('sinon');
const controller = require('../../../src/controllers/replication');
const replicationService = require('../../../src/services/replication');
const serverUtils = require('../../../src/server-utils');

let req;
let res;

describe('Initial Replication controller', () => {
  beforeEach(() => {
    req = Object.freeze({ userCtx: { name: 'michael' } });
    res = { json: sinon.stub() };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getDocIds', () => {
    it('should respond with list of docs', async () => {
      sinon.stub(replicationService, 'getContext').resolves({
        docIds: [1, 2, 3],
        warnDocIds: [2, 3],
        lastSeq: '123-gdhsjfs',
        warn: false,
        limit: 1000,
      });
      sinon.stub(replicationService, 'getDocIdsRevPairs').resolves([
        { id: 1, rev: 1 },
        { id: 2, rev: 1 },
        { id: 3, rev: 1 },
      ]);

      await controller.getDocIds(req, res);

      expect(replicationService.getContext.args).to.deep.equal([[req.userCtx]]);
      expect(replicationService.getDocIdsRevPairs.args).to.deep.equal([[[1, 2, 3]]]);
      expect(res.json.args).to.deep.equal([[{
        doc_ids_revs: [
          { id: 1, rev: 1 },
          { id: 2, rev: 1 },
          { id: 3, rev: 1 },
        ],
        warn_docs: 2,
        last_seq: '123-gdhsjfs',
        warn: false,
        limit: 1000,
      }]]);
    });

    it('should forward doc count warning', async () => {
      sinon.stub(replicationService, 'getContext').resolves({
        docIds: [4, 5, 6],
        warnDocIds: [4, 5, 6],
        lastSeq: '222-ghfdjki',
        warn: true,
        limit: 2,
      });
      sinon.stub(replicationService, 'getDocIdsRevPairs').resolves([
        { id: 4, rev: 1 },
        { id: 5, rev: 1 },
        { id: 6, rev: 1 },
      ]);

      await controller.getDocIds(req, res);

      expect(replicationService.getContext.args).to.deep.equal([[req.userCtx]]);
      expect(replicationService.getDocIdsRevPairs.args).to.deep.equal([[[4, 5, 6]]]);
      expect(res.json.args).to.deep.equal([[{
        doc_ids_revs: [
          { id: 4, rev: 1 },
          { id: 5, rev: 1 },
          { id: 6, rev: 1 },
        ],
        warn_docs: 3,
        last_seq: '222-ghfdjki',
        warn: true,
        limit: 2,
      }]]);
    });

    it('should respond with error when getting context fails', async () => {
      sinon.stub(replicationService, 'getContext').rejects({ status: 500 });
      sinon.stub(serverUtils, 'serverError');

      await controller.getDocIds(req, res);

      expect(replicationService.getContext.callCount).to.equal(1);
      expect(serverUtils.serverError.args).to.deep.equal([[ { status: 500 }, req, res ]]);
      expect(res.json.callCount).to.equal(0);
    });

    it('should respond with error when getting id-revs pairs fails', async () => {
      sinon.stub(replicationService, 'getContext').resolves({
        docIds: [4, 5, 6],
        warnDocIds: [4, 5, 6],
        lastSeq: '222-ghfdjki',
        warn: true,
        limit: 2,
      });
      sinon.stub(replicationService, 'getDocIdsRevPairs').rejects({ status: 502 });
      sinon.stub(serverUtils, 'serverError');

      await controller.getDocIds(req, res);

      expect(replicationService.getContext.callCount).to.equal(1);
      expect(serverUtils.serverError.args).to.deep.equal([[ { status: 502 }, req, res ]]);
      expect(res.json.callCount).to.equal(0);
    });
  });

  describe('getForm', () => {
    it('should return form doc when found', async () => {
      const formDoc = {
        _id: 'form:anc_registration',
        type: 'form',
        internalId: 'anc_registration',
        _attachments: {
          'anc_registration.xml': { stub: true, content_type: 'application/xml', length: 12345 },
        },
      };
      sinon.stub(replicationService, 'getForm').resolves(formDoc);
      req = { ...req, params: { formId: 'anc_registration' } };

      await controller.getForm(req, res);

      expect(replicationService.getForm.args).to.deep.equal([['anc_registration']]);
      expect(res.json.args).to.deep.equal([[formDoc]]);
    });

    it('should return 404 when form doc is not found', async () => {
      const notFoundError = { status: 404 };
      sinon.stub(replicationService, 'getForm').rejects(notFoundError);
      sinon.stub(serverUtils, 'error');
      req = { ...req, params: { formId: 'missing_form' } };

      await controller.getForm(req, res);

      expect(replicationService.getForm.callCount).to.equal(1);
      expect(serverUtils.error.args).to.deep.equal([[
        { code: 404, message: 'Form not found: missing_form' },
        req,
        res,
      ]]);
      expect(res.json.callCount).to.equal(0);
    });

    it('should return 400 when formId param is missing', async () => {
      sinon.stub(serverUtils, 'error');
      req = { ...req, params: {} };

      await controller.getForm(req, res);

      expect(serverUtils.error.args).to.deep.equal([[
        { code: 400, message: 'Missing form ID' },
        req,
        res,
      ]]);
      expect(res.json.callCount).to.equal(0);
    });

    it('should return server error on unexpected db error', async () => {
      sinon.stub(replicationService, 'getForm').rejects({ status: 500 });
      sinon.stub(serverUtils, 'serverError');
      req = { ...req, params: { formId: 'anc_registration' } };

      await controller.getForm(req, res);

      expect(replicationService.getForm.callCount).to.equal(1);
      expect(serverUtils.serverError.args).to.deep.equal([[{ status: 500 }, req, res]]);
      expect(res.json.callCount).to.equal(0);
    });
  });
});
