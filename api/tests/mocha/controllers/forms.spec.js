const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const auth = require('../../../src/auth');
const db = require('../../../src/db');
const controller = rewire('../../../src/controllers/forms');
const serverUtils = require('../../../src/server-utils');

const mockFormsInDb = (...docs) => {
  sinon.stub(db.medic, 'query').resolves({
    rows: docs.map(doc => ({ doc: doc })),
  });
};

const res = {
  writeHead: () => {},
  end: () => {},
  json: () => {},
  status: () => {},
};

describe('forms controller', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('get', () => {

    it('returns auth error when not logged in', () => {
      const req = { params: { form: 'a.xml' } };
      sinon.stub(auth, 'check').rejects({ code: 400, message: 'icky' });
      const query = sinon.stub(db.medic, 'query');
      const error = sinon.stub(serverUtils, 'error');
      return controller.get(req, res).then(() => {
        chai.expect(error.args[0][0].message).to.equal('icky');
        chai.expect(query.callCount).to.equal(0);
      });
    });

    it('returns error from view query', () => {
      const req = { params: { form: 'a.xml' } };
      sinon.stub(auth, 'check').resolves();
      const query = sinon
        .stub(db.medic, 'query')
        .returns(Promise.reject('icky'));
      const error = sinon.stub(serverUtils, 'error');
      return controller.get(req, res).then(() => {
        chai.expect(error.args[0][0]).to.equal('icky');
        chai.expect(query.callCount).to.equal(1);
      });
    });

    it('returns body and headers from attachment query', () => {
      const req = { params: { form: 'a.xml' } };
      sinon.stub(auth, 'check').resolves();
      sinon.stub(db.medic, 'query').resolves({
        rows: [
          {
            doc: {
              internalId: 'a',
              _attachments: {
                xml: {
                  content_type: 'xml',
                  data: 'foo',
                },
              },
            },
          },
        ],
      });
      const end = sinon.stub(res, 'end');
      const writeHead = sinon.stub(res, 'writeHead');

      return controller.get(req, res).then(() => {
        chai.expect(writeHead.args[0][0]).to.equal(200);
        chai
          .expect(writeHead.args[0][1])
          .to.deep.equal({ 'Content-Type': 'xml' });
        chai.expect(end.args[0][0]).to.equal('foo');
      });
    });
  });

  describe('list', () => {

    it('returns auth error when not logged in', () => {
      const req = { params: { form: 'a.xml' } };
      sinon.stub(auth, 'check').rejects({ code: 400, message: 'icky' });
      const query = sinon.stub(db.medic, 'query');
      const error = sinon.stub(serverUtils, 'error');
      return controller.list(req, res).then(() => {
        chai.expect(error.args[0][0].message).to.equal('icky');
        chai.expect(query.callCount).to.equal(0);
      });
    });

    it('returns error from view query', () => {
      const req = {};
      sinon.stub(auth, 'check').resolves();
      const get = sinon.stub(db.medic, 'query').returns(Promise.reject('icky'));
      const error = sinon.stub(serverUtils, 'error');
      return controller.list(req, res).then(() => {
        chai.expect(error.args[0][0]).to.equal('icky');
        chai.expect(get.callCount).to.equal(1);
      });
    });

    it('returns all forms', () => {
      mockFormsInDb(
        {
          _id: 'form:stock',
          internalId: 'stock',
          _attachments: {
            xml: {
              content_type: 'application/octet-stream',
              revpos: 2,
              digest: 'md5-++6M50YX9KqBr0tD9ayNXg==',
              length: 23663,
              stub: true,
            },
          },
        },
        {
          _id: 'form:visit',
          internalId: 'visit',
          _attachments: {
            xml: {
              content_type: 'application/octet-stream',
              revpos: 5,
              digest: 'md5-oaCI+4Gupwh75qmFBikRCg==',
              length: 23800,
              stub: true,
            },
          },
        }
      );
      const req = { headers: {} };
      const end = sinon.stub(res, 'end');
      const writeHead = sinon.stub(res, 'writeHead');
      sinon.stub(auth, 'check').resolves();

      return controller.list(req, res).then(() => {
        chai.expect(writeHead.args[0][0]).to.equal(200);
        chai
          .expect(writeHead.args[0][1])
          .to.deep.equal({ 'Content-Type': 'application/json; charset=utf-8' });
        const forms = JSON.parse(end.args[0][0]);
        chai.expect(forms).to.deep.equal(['stock.xml', 'visit.xml']);
      });
    });

    it('ignores non xml attachments', () => {
      mockFormsInDb({
        _id: 'form:stock',
        internalId: 'stock',
        _attachments: {
          xml: {
            content_type: 'application/octet-stream',
            revpos: 2,
            digest: 'md5-++6M50YX9KqBr0tD9ayNXg==',
            length: 23663,
            stub: true,
          },
          'someimg.png': {
            content_type: 'application/octet-stream',
            revpos: 2,
            digest: 'md5-++6M50YX9KqBr0tD9ayNXg==',
            length: 23663,
            stub: true,
          },
        },
      });
      const req = { headers: {} };
      const end = sinon.stub(res, 'end');
      sinon.stub(res, 'writeHead');
      sinon.stub(auth, 'check').resolves();

      return controller.list(req, res).then(() => {
        const forms = JSON.parse(end.args[0][0]);
        chai.expect(forms).to.deep.equal(['stock.xml']);
      });
    });
  });

  describe('validate', () => {

    it('returns ok when validations passed', async () => {
      const req = { body: '<xml></xml>' };
      const json = sinon.stub(res, 'json');
      await controller.__with__({
        'generateXform': { generate: sinon.stub().resolves() },
        'auth': { check: sinon.stub().resolves() },
      })(async () => {
        await controller.validate(req, res);
        chai.expect(json.callCount).to.equal(1);
        chai.expect(json.args[0][0]).to.deep.equal({ok: true});
      });
    });

    it('returns error when validations failed', async () => {
      const req = { body: '<xml a INVALID form<///xml>' };
      const json = sinon.stub(res, 'json');
      const status = sinon.stub(res, 'status').returns({ json: json });
      await controller.__with__({
        'generateXform': { generate: sinon.stub().rejects(new Error('Error transforming xml')) },
        'auth': { check: sinon.stub().resolves() },
      })(async () => {
        await controller.validate(req, res);
        chai.expect(json.callCount).to.equal(1);
        chai.expect(json.args[0][0].error).to.include('Error transforming xml');
        chai.expect(status.callCount).to.equal(1);
        chai.expect(status.args[0][0]).to.equal(400);
      });
    });

    it('returns error when not logged in', async () => {
      const req = { body: '<xml></xml>' };
      const json = sinon.stub(res, 'json');
      const status = sinon.stub(res, 'status').returns({ json: json });
      await controller.__with__({
        'generateXform': { generate: sinon.stub().resolves() },
        'auth': { check: sinon.stub().rejects({ code: 401, message: 'Not logged in', err: new Error('Error ...') }) },
      })(async () => {
        await controller.validate(req, res);
        chai.expect(status.callCount).to.equal(1);
        chai.expect(status.args[0][0]).to.equal(401);
        chai.expect(json.callCount).to.equal(1);
        chai.expect(json.args[0][0]).to.deep.equal({error: 'Not logged in'});
      });
    });

    it('returns error when auth failed with lack of permission', async () => {
      const req = { body: '<xml></xml>' };
      const json = sinon.stub(res, 'json');
      const status = sinon.stub(res, 'status').returns({ json: json });
      const authCheck = sinon.stub();
      authCheck.withArgs(req, 'can_configure').rejects({ code: 403, message: 'Insufficient privileges' });
      authCheck.withArgs(sinon.match.any).rejects({ code: 400, message: 'Another error' });
      await controller.__with__({
        'generateXform': { generate: sinon.stub().resolves() },
        'auth': { check: authCheck },
      })(async () => {
        await controller.validate(req, res);
        chai.expect(authCheck.callCount).to.equal(1);
        chai.expect(authCheck.args[0]).to.deep.equal([req, 'can_configure']);
        chai.expect(status.callCount).to.equal(1);
        chai.expect(status.args[0][0]).to.equal(403);
        chai.expect(json.callCount).to.equal(1);
        chai.expect(json.args[0][0]).to.deep.equal({error: 'Insufficient privileges'});
      });
    });
  });
});
