var sinon = require('sinon'),
    feedback = require('../../../static/js/modules/feedback'),
    clock,
    getUserCtx,
    saveDoc,
    mockConsole,
    mockWindow,
    mockDocument;

exports.setUp = function (callback) {
  getUserCtx = sinon.stub();
  saveDoc = sinon.stub();
  mockDocument = {};
  mockConsole = {
    error: sinon.stub(),
    warn: sinon.stub(),
    info: sinon.stub(),
    log: sinon.stub()
  };
  mockWindow = sinon.stub();
  clock = sinon.useFakeTimers();
  callback();
};

exports.tearDown = function (callback) {
  clock.restore();
  callback();
};

exports['unhandled error submits feedback'] = function(test) {
  test.expect(22);

  getUserCtx.callsArgWith(0, null, { name: 'fred' });
  saveDoc.callsArgWith(1);

  feedback.init({
    saveDoc: saveDoc,
    getUserCtx: getUserCtx,
    console: mockConsole,
    window: mockWindow
  });

  mockConsole.log('Trying to save');
  mockConsole.info('Saving in process');
  mockConsole.warn('Saving taking a while');
  mockConsole.error('Failed to save', '404');

  feedback.submit({ message: 'hello world' }, { name: 'medic', version: '0.5.0' }, function() {

    test.equals(getUserCtx.callCount, 1);
    test.equals(saveDoc.callCount, 1);
    var submittedDoc = saveDoc.args[0][0];

    test.equals(submittedDoc.type, 'feedback');
    test.equals(submittedDoc.info.message, 'hello world');
    test.equals(submittedDoc.meta.user.name, 'fred');
    test.equals(submittedDoc.meta.app, 'medic');
    test.equals(submittedDoc.meta.version, '0.5.0');
    test.equals(submittedDoc.meta.time, '1970-01-01T00:00:00.000Z');
    
    test.equals(submittedDoc.log.length, 4);
    test.equals(submittedDoc.log[0].level, 'error');
    test.equals(submittedDoc.log[0].arguments.length, 2);
    test.equals(submittedDoc.log[0].arguments[0], 'Failed to save');
    test.equals(submittedDoc.log[0].arguments[1], '404');
    test.equals(submittedDoc.log[1].level, 'warn');
    test.equals(submittedDoc.log[1].arguments.length, 1);
    test.equals(submittedDoc.log[1].arguments[0], 'Saving taking a while');
    test.equals(submittedDoc.log[2].level, 'info');
    test.equals(submittedDoc.log[2].arguments.length, 1);
    test.equals(submittedDoc.log[2].arguments[0], 'Saving in process');
    test.equals(submittedDoc.log[3].level, 'log');
    test.equals(submittedDoc.log[3].arguments.length, 1);
    test.equals(submittedDoc.log[3].arguments[0], 'Trying to save');

    test.done();

  });
};

exports['log history restricted to 20 lines'] = function(test) {
  test.expect(5);

  getUserCtx.callsArgWith(0, null, { name: 'fred' });
  saveDoc.callsArgWith(1);
  feedback.init({
    saveDoc: saveDoc,
    getUserCtx: getUserCtx,
    console: mockConsole,
    window: mockWindow
  });

  for (var i = 0; i < 25; i++) {
    mockConsole.log('item ' + i);
  }

  feedback.submit({ message: 'hello world' }, { }, function() {
    test.equals(getUserCtx.callCount, 1);
    test.equals(saveDoc.callCount, 1);

    var submittedDoc = saveDoc.args[0][0];
    test.equals(submittedDoc.log.length, 20);
    test.equals(submittedDoc.log[0].arguments[0], 'item 24');
    test.equals(submittedDoc.log[19].arguments[0], 'item 5');

    test.done();

  });

};

exports['password in URL is blanked out'] = function(test) {
  test.expect(6);

  getUserCtx.callsArgWith(0, null, { name: 'fred' });
  saveDoc.callsArgWith(1);

  feedback.init({
    saveDoc: saveDoc,
    getUserCtx: getUserCtx,
    console: mockConsole,
    window: mockWindow,
    document: mockDocument
  });

  mockDocument.URL = 'http://gareth:SUPERSECRET!@somewhere.com';

  feedback.submit({ message: 'hello world' }, { name: 'medic', version: '0.5.0' }, function() {

    test.equals(getUserCtx.callCount, 1);
    test.equals(saveDoc.callCount, 1);
    var submittedDoc = saveDoc.args[0][0];

    test.equals(submittedDoc.meta.url, 'http://gareth:********@somewhere.com');
    test.equals(submittedDoc.meta.app, 'medic');
    test.equals(submittedDoc.meta.version, '0.5.0');
    test.equals(submittedDoc.meta.time, '1970-01-01T00:00:00.000Z');

    test.done();

  });
};