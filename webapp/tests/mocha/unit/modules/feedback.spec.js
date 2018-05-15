const sinon = require('sinon'),
      feedback = require('../../../../src/js/modules/feedback'),
      assert = require('chai').assert;

let clock,
    getUserCtx,
    saveDoc,
    mockConsole,
    mockWindow,
    mockDocument;

describe('feedback', () => {

  beforeEach(done => {
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
    done();
  });

  afterEach(done => {
    clock.restore();
    done();
  });

  it('unhandled error submits feedback', done => {
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

    feedback.submit({ message: 'hello world' }, { name: 'medic', version: '0.5.0' }, () => {

      assert.equal(getUserCtx.callCount, 1);
      assert.equal(saveDoc.callCount, 1);
      const submittedDoc = saveDoc.args[0][0];

      assert.equal(submittedDoc.type, 'feedback');
      assert.equal(submittedDoc.info.message, 'hello world');
      assert.equal(submittedDoc.meta.user.name, 'fred');
      assert.equal(submittedDoc.meta.app, 'medic');
      assert.equal(submittedDoc.meta.version, '0.5.0');
      assert.equal(submittedDoc.meta.time, '1970-01-01T00:00:00.000Z');
      
      assert.equal(submittedDoc.log.length, 4);
      assert.equal(submittedDoc.log[0].level, 'error');
      assert.equal(submittedDoc.log[0].arguments, '{"0":"Failed to save","1":"404"}');
      assert.equal(submittedDoc.log[1].level, 'warn');
      assert.equal(submittedDoc.log[1].arguments, '{"0":"Saving taking a while"}');
      assert.equal(submittedDoc.log[2].level, 'info');
      assert.equal(submittedDoc.log[2].arguments, '{"0":"Saving in process"}');
      assert.equal(submittedDoc.log[3].level, 'log');
      assert.equal(submittedDoc.log[3].arguments, '{"0":"Trying to save"}');

      done();
    });
  });

  it('log history restricted to 20 lines', done => {
    getUserCtx.callsArgWith(0, null, { name: 'fred' });
    saveDoc.callsArgWith(1);
    feedback.init({
      saveDoc: saveDoc,
      getUserCtx: getUserCtx,
      console: mockConsole,
      window: mockWindow
    });

    for (let i = 0; i < 25; i++) {
      mockConsole.log('item ' + i);
    }

    feedback.submit({ message: 'hello world' }, { }, () => {
      assert.equal(getUserCtx.callCount, 1);
      assert.equal(saveDoc.callCount, 1);

      const submittedDoc = saveDoc.args[0][0];
      assert.equal(submittedDoc.log.length, 20);
      assert.equal(submittedDoc.log[0].arguments, '{"0":"item 24"}');
      assert.equal(submittedDoc.log[19].arguments, '{"0":"item 5"}');

      done();
    });

  });

  it('password in URL is blanked out', done => {
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

    feedback.submit({ message: 'hello world' }, { name: 'medic', version: '0.5.0' }, () => {

      assert.equal(getUserCtx.callCount, 1);
      assert.equal(saveDoc.callCount, 1);
      const submittedDoc = saveDoc.args[0][0];

      assert.equal(submittedDoc.meta.url, 'http://gareth:********@somewhere.com');
      assert.equal(submittedDoc.meta.app, 'medic');
      assert.equal(submittedDoc.meta.version, '0.5.0');
      assert.equal(submittedDoc.meta.time, '1970-01-01T00:00:00.000Z');

      done();
    });
  });

});
