var sinon = require('sinon'),
    feedback = require('../feedback'),
    clock,
    getUserCtx,
    saveDoc;

exports.setUp = function (callback) {
  getUserCtx = sinon.stub();
  saveDoc = sinon.stub();
  clock = sinon.useFakeTimers();
  callback();
};

exports.tearDown = function (callback) {
  clock.restore();
  if (getUserCtx.restore) {
    getUserCtx.restore();
  }
  if (saveDoc.restore) {
    saveDoc.restore();
  }
  callback();
};

exports['unhandled error submits feedback'] = function(test) {
  test.expect(22);

  getUserCtx.callsArgWith(0, null, { name: 'fred' });
  saveDoc.callsArgWith(1);

  console.log('Trying to save');
  console.info('Saving in process');
  console.warn('Saving taking a while');
  console.error('Failed to save', '404');

  feedback.init(saveDoc, getUserCtx);
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
  feedback.init(saveDoc, getUserCtx);

  for (var i = 0; i < 25; i++) {
    console.log('item ' + i);
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