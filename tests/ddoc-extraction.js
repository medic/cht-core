var ddocExtraction = require('../ddoc-extraction'),
    sinon = require('sinon'),
    utils = require('./utils'),
    db = require('../db');

exports['ddocNameFromAttachmentName works'] = function(test) {
  test.expect(1);
  test.equal(
    ddocExtraction.ddocNameFromAttachmentName('ddocs/compiled/erlang_filters.json'),
    '_design/erlang_filters');
  test.done();
};

exports['extractDdocs finds attached ddoc names'] = function(test) {
  test.expect(1);

  ddocExtraction.extractDdocs({
    _rev: 'test-123',
    _attachments: {
      'foo': {},
      'bar': {},
      'ddocs/compiled/erlang_filters.json': {},
    }
  }, function(err, masterRevision, attachmentNames) {
    test.deepEqual(attachmentNames, ['ddocs/compiled/erlang_filters.json']);
    test.done();
  });
};

var testMasterDdoc = {
  _id: '_design/medic',
  _rev: '1-testMasterDdocRev',
  _attachments: {
    'foo': {},
    'bar': {},
    'ddocs/compiled/something_old.json': {},
    'ddocs/compiled/something_stale.json': {},
    'ddocs/compiled/something_new.json': {}
  }
};

var somethingOldAttachment = {
  _id: '_design/something_old'
};
var somethingStaleAttachment = {
  _id: '_design/something_stale'
};
var somethingNewAttachment = {
  _id: '_design/something_new'
};

var somethingOldDdoc = {
  _id: '_design/something_old',
  parentRev: '1-testMasterDdocRev'
};

var somethingStaleDdoc = {
  _id: '_design/something_stale',
  parentRev: '1-testMasterDdocRevOld'
};

exports.tearDown = function (callback) {
  utils.restore(db.medic.get);
  callback();
};

exports['run finds all attached ddocs and, if required, updates them'] = function(test) {
  test.expect(9);

  var wrappedGet = sinon.stub(db.medic, 'get');

  var getDdoc = wrappedGet.withArgs('_design/medic').callsArgWith(1, null, testMasterDdoc, {});
  var getSomethingOldAttachment = wrappedGet.withArgs('_design/medic/ddocs/compiled/something_old.json').callsArgWith(1, null, somethingOldAttachment);
  var getSomethingStaleAttachment = wrappedGet.withArgs('_design/medic/ddocs/compiled/something_stale.json').callsArgWith(1, null, somethingStaleAttachment);
  var getSomethingNewAttachment = wrappedGet.withArgs('_design/medic/ddocs/compiled/something_new.json').callsArgWith(1, null, somethingNewAttachment);
  var getSomethingOldDdoc = wrappedGet.withArgs('_design/something_old').callsArgWith(1, null, somethingOldDdoc);
  var getSomethingStaleDdoc = wrappedGet.withArgs('_design/something_stale').callsArgWith(1, null, somethingStaleDdoc);
  var getSomethingNewDdoc = wrappedGet.withArgs('_design/something_new').callsArgWith(1, {error: 'not_found'});

  var wrappedInsert = sinon.stub(db.medic, 'insert').callsArg(1);

  ddocExtraction.run(function(err) {
    test.ok(!err);

    test.equals(getDdoc.callCount, 1);
    test.equals(getSomethingOldAttachment.callCount, 1);
    test.equals(getSomethingStaleAttachment.callCount, 1);
    test.equals(getSomethingNewAttachment.callCount, 1);
    test.equals(getSomethingOldDdoc.callCount, 1);
    test.equals(getSomethingStaleDdoc.callCount, 1);
    test.equals(getSomethingNewDdoc.callCount, 1);

    test.equals(wrappedInsert.callCount, 2);

    test.done();
  });
};

exports['works when there are no attached ddocs'] = function(test) {
  test.expect(2);

  var wrappedGet = sinon.stub(db.medic, 'get');

  wrappedGet.withArgs('_design/medic').callsArgWith(1, null, {
    _id: '_design/medic',
    _rev: '1-testMasterDdocRev',
    _attachments: {
      'foo': {},
      'bar': {},
    }});

  ddocExtraction.run(function(err) {
    test.ok(!err);

    test.ok(wrappedGet.calledOnce);
    test.done();
  });
};
