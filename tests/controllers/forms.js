/* jshint unused: false */

var controller = require('../../controllers/forms'),
    db = require('../../db'),
    sinon = require('sinon');

exports.tearDown = function (callback) {
  if (db.request.restore) {
    db.request.restore();
  }
  if (db.sanitizeResponse.restore) {
    db.sanitizeResponse.restore();
  }
  if (db.medic.view.restore) {
    db.medic.view.restore();
  }
  if (db.medic.attachment.get.restore) {
    db.medic.attachment.get.restore();
  }
  callback();
};

exports['getForm returns error from view query'] = function(test) {
  test.expect(2);
  var req = sinon.stub(db.medic, 'view').callsArgWith(3, 'icky');
  controller.getForm('', '', function(err, results) {
    test.equals(err, 'icky');
    test.equals(req.callCount, 1);
    test.done();
  });
};

exports['getForm returns form not found message on empty view query'] = function(test) {
  test.expect(2);
  var req = sinon.stub(db.medic, 'view').callsArgWith(3, null, {rows: []});
  controller.getForm('', '', function(err, body, headers) {
    test.equals(err.message, 'Form not found.');
    test.equals(req.callCount, 1);
    test.done();
  });
};

exports['getForm returns error from attachment query'] = function(test) {
  test.expect(3);
  var req1 = sinon.stub(db.medic, 'view').callsArgWith(3, null, {rows: [1]});
  var req2 = sinon.stub(db.medic.attachment, 'get').callsArgWith(2, 'boop');
  controller.getForm('', '', function(err, body, headers) {
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
    'uri' : 'http://admin:secret@localhost',
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
  controller.listForms({}, function(err, body, headers) {
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
  controller.listForms({}, function(err, body, headers) {
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
  controller.listForms({'x-openrosa-version': '1.0'}, function(err, body, headers) {
    test.equals(err, null);
    test.equals(spy.callCount, 1);
    test.done();
  });
};
