const chai = require('chai');
const sinon = require('sinon');
const db = require('../../../src/db');
const controller = require('../../../src/controllers/forms');
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
    it('returns error from view query', () => {
      const req = { params: { form: 'a.xml' } };
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
    it('returns error from view query', () => {
      const req = {};
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
      await controller.validate(req, res);
      chai.expect(json.callCount).to.equal(1);
      chai.expect(json.args[0][0]).to.deep.equal({ok: true});
    });

    it('returns error when validations failed', async () => {
      const req = { body: '<xml a INVALID form<///xml>' };
      const json = sinon.stub(res, 'json');
      const status = sinon.stub(res, 'status').returns({ json: json });
      await controller.validate(req, res);
      chai.expect(json.callCount).to.equal(1);
      chai.expect(json.args[0][0].error).to.include('Error transforming xml. xsltproc returned code');
      chai.expect(status.callCount).to.equal(1);
      chai.expect(status.args[0][0]).to.equal(400);
    });
  });
});
