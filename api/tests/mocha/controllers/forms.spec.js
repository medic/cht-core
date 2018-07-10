const controller = require('../../../src/controllers/forms'),
      chai = require('chai'),
      db = require('../../../src/db-nano'),
      sinon = require('sinon');

const mockFormsInDb = (...docs) => {
  sinon.stub(db.medic, 'view')
      .callsArgWith(3, null, { rows: docs.map(doc => ({ doc:doc })) });
};

describe('forms controller', () => {

  afterEach(() => {
    sinon.restore();
  });

  it('getForm returns error from view query', done => {
    const req = sinon.stub(db.medic, 'view').callsArgWith(3, 'icky');
    controller.getForm('', '', err => {
      chai.expect(err).to.equal('icky');
      chai.expect(req.callCount).to.equal(1);
      done();
    });
  });

  it('getForm returns form not found message on empty view query', done => {
    const req = sinon.stub(db.medic, 'view').callsArgWith(3, null, {rows: []});
    controller.getForm('', '', err => {
      chai.expect(err.message).to.equal('Form not found:  ()');
      chai.expect(req.callCount).to.equal(1);
      done();
    });
  });

  it('getForm returns error from attachment query', done => {
    const req1 = sinon.stub(db.medic, 'view').callsArgWith(3, null, {rows: [1]});
    const req2 = sinon.stub(db.medic.attachment, 'get').callsArgWith(2, 'boop');
    controller.getForm('', '', err => {
      chai.expect(err).to.equal('boop');
      chai.expect(req1.callCount).to.equal(1);
      chai.expect(req2.callCount).to.equal(1);
      done();
    });
  });

  it('getForm returns body and headers from attachment query', done => {
    sinon.stub(db.medic, 'view').callsArgWith(3, null, {rows: [1]});
    sinon.stub(db.medic.attachment, 'get').callsArgWith(2, null, 'foo', {
      'content-type': 'xml'
    });
    controller.getForm('', '', (err, body, headers) => {
      chai.expect(body).to.equal('foo');
      chai.expect(headers).to.deep.equal({'content-type': 'xml'});
      done();
    });
  });

  it('getForm sanitizes bad headers from attachment query', done => {
    sinon.stub(db.medic, 'view').callsArgWith(3, null, {rows: [1]});
    sinon.stub(db.medic.attachment, 'get').callsArgWith(2, null, 'foo', {
      'content-type': 'xml',
      'uri' : 'http://admin:passwordSUP3RS3CR37!@localhost',
      'statusCode' : 'junk'
    });
    const spy = sinon.spy(db, 'sanitizeResponse');
    controller.getForm('', '', (err, body, headers) => {
      chai.expect(body).to.equal('foo');
      chai.expect(headers).to.deep.equal({'content-type': 'xml'});
      chai.expect(spy.called).to.equal(true);
      done();
    });
  });

  it('listForms returns error from view query', done => {
    const req = sinon.stub(db.medic, 'view').callsArgWith(3, 'icky');
    controller.listForms({}, err => {
      chai.expect(err).to.equal('icky');
      chai.expect(req.callCount).to.equal(1);
      done();
    });
  });

  it('listForms sanitizes response', done => {
    sinon.stub(db.medic, 'view').callsArgWith(3, null, {
      rows: [1]
    });
    const spy = sinon.spy(db, 'sanitizeResponse');
    controller.listForms({}, err => {
      chai.expect(spy.callCount).to.equal(1);
      done(err);
    });
  });

  it('listForms sanitizes openrosa response', done => {
    sinon.stub(db.medic, 'view').callsArgWith(3, null, {
      rows: [1]
    });
    const spy = sinon.spy(db, 'sanitizeResponse');
    controller.listForms({'x-openrosa-version': '1.0'}, err => {
      chai.expect(spy.callCount).to.equal(1);
      done(err);
    });
  });

  it('listForms returns all forms', done => {

    mockFormsInDb(
        {
          _id: 'form:stock',
          _attachments: {
            xml: {
              content_type: 'application/octet-stream',
              revpos: 2,
              digest: 'md5-++6M50YX9KqBr0tD9ayNXg==',
              length: 23663,
              stub: true
            }
          }
        },
        {
          _id: 'form:visit',
          _attachments: {
            xml: {
              content_type: 'application/octet-stream',
              revpos: 5,
              digest: 'md5-oaCI+4Gupwh75qmFBikRCg==',
              length: 23800,
              stub: true
            }
          }
        });

    controller.listForms({}, (err, body) => {
      const forms = JSON.parse(body);
      chai.expect(forms).to.deep.equal([ 'stock.xml', 'visit.xml' ]);
      done(err);
    });
  });

  it('listForms ignores non xml attachments', done => {
    mockFormsInDb({
        _id: 'form:stock',
        _attachments: {
          xml: {
            content_type: 'application/octet-stream',
            revpos: 2,
            digest: 'md5-++6M50YX9KqBr0tD9ayNXg==',
            length: 23663,
            stub: true
          },
          'someimg.png': {
            content_type: 'application/octet-stream',
            revpos: 2,
            digest: 'md5-++6M50YX9KqBr0tD9ayNXg==',
            length: 23663,
            stub: true
          }
        }
      });

    controller.listForms({}, (err, body) => {
      const forms = JSON.parse(body);
      chai.expect(forms.length).to.equal(1);
      chai.expect(forms[0]).to.equal('stock.xml');
      done(err);
    });
  });

});
