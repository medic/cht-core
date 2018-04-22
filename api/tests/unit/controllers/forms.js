var controller = require('../../../src/controllers/forms'),
    db = require('../../../src/db-nano'),
    sinon = require('sinon').sandbox.create();

exports.tearDown = function (callback) {
  sinon.restore();
  callback();
};

exports['getForm returns error from view query'] = function(test) {
  test.expect(2);
  var req = sinon.stub(db.medic, 'view').callsArgWith(3, 'icky');
  controller.getForm('', '', function(err) {
    test.equals(err, 'icky');
    test.equals(req.callCount, 1);
    test.done();
  });
};

exports['getForm returns form not found message on empty view query'] = function(test) {
  test.expect(2);
  var req = sinon.stub(db.medic, 'view').callsArgWith(3, null, {rows: []});
  controller.getForm('', '', function(err) {
    test.equals(err.message, 'Form not found:  ()');
    test.equals(req.callCount, 1);
    test.done();
  });
};

exports['getForm returns error from attachment query'] = function(test) {
  test.expect(3);
  var req1 = sinon.stub(db.medic, 'view').callsArgWith(3, null, {rows: [1]});
  var req2 = sinon.stub(db.medic.attachment, 'get').callsArgWith(2, 'boop');
  controller.getForm('', '', function(err) {
    test.equals(err, 'boop');
    test.equals(req1.callCount, 1);
    test.equals(req2.callCount, 1);
    test.done();
  });
};

exports['getForm returns body and headers from attachment query'] = function(test) {
  test.expect(2);
  sinon.stub(db.medic, 'view').callsArgWith(3, null, {rows: [1]});
  sinon.stub(db.medic.attachment, 'get').callsArgWith(2, null, 'foo', {
    'content-type': 'xml'
  });
  controller.getForm('', '', function(err, body, headers) {
    test.equals(body, 'foo');
    test.deepEqual(headers, {'content-type': 'xml'});
    test.done();
  });
};

exports['getForm sanitizes bad headers from attachment query'] = function(test) {
  test.expect(3);
  sinon.stub(db.medic, 'view').callsArgWith(3, null, {rows: [1]});
  sinon.stub(db.medic.attachment, 'get').callsArgWith(2, null, 'foo', {
    'content-type': 'xml',
    'uri' : 'http://admin:passwordSUP3RS3CR37!@localhost',
    'statusCode' : 'junk'
  });
  var spy = sinon.spy(db, 'sanitizeResponse');
  controller.getForm('', '', function(err, body, headers) {
    test.equals(body, 'foo');
    test.deepEqual(headers, {'content-type': 'xml'});
    test.ok(spy.called);
    test.done();
  });
};

exports['listForms returns error from view query'] = function(test) {
  test.expect(2);
  var req = sinon.stub(db.medic, 'view').callsArgWith(3, 'icky');
  controller.listForms({}, function(err) {
    test.equals(err, 'icky');
    test.equals(req.callCount, 1);
    test.done();
  });
};

exports['listForms sanitizes response'] = function(test) {
  test.expect(2);
  sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [1]
  });
  var spy = sinon.spy(db, 'sanitizeResponse');
  controller.listForms({}, function(err) {
    test.equals(err, null);
    test.equals(spy.callCount, 1);
    test.done();
  });
};

exports['listForms sanitizes openrosa response'] = function(test) {
  test.expect(2);
  sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [1]
  });
  var spy = sinon.spy(db, 'sanitizeResponse');
  controller.listForms({'x-openrosa-version': '1.0'}, function(err) {
    test.equals(err, null);
    test.equals(spy.callCount, 1);
    test.done();
  });
};

exports['listForms returns all forms'] = function(test) {
  test.expect(2);

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

  controller.listForms({}, function(err, body) {
    test.equals(err, null);

    var forms = JSON.parse(body);
    test.deepEqual(forms, [ 'stock.xml', 'visit.xml' ]);

    test.done();
  });
};

exports['listForms ignores non xml attachments'] = function(test) {
  test.expect(3);
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

  controller.listForms({}, function(err, body) {
    test.equals(err, null);

    var forms = JSON.parse(body);
    test.equals(forms.length, 1);
    test.equals(forms[0], 'stock.xml');

    test.done();
  });
};

function mockFormsInDb(...docs) {
  sinon.stub(db.medic, 'view')
      .callsArgWith(3, null, { rows: docs.map(doc => ({ doc:doc })) });
}
