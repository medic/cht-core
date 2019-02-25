describe('Feedback service', function() {

  'use strict';

  let clock,
      post,
      mockConsole,
      mockWindow,
      mockDocument,
      service;

  beforeEach(function() {
    post = sinon.stub();
    mockDocument = {};
    mockConsole = {
      error: sinon.stub(),
      warn: sinon.stub(),
      info: sinon.stub(),
      log: sinon.stub()
    };
    mockWindow = sinon.stub();
    clock = sinon.useFakeTimers();

    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({
        post: post
      }));
      $provide.value('Session', { 
        userCtx: function() {
          return { name: 'fred' };
        } 
      });
      $provide.constant('APP_CONFIG', { name: 'medic', version: '0.5.0' });
    });
    inject(function($injector) {
      service = $injector.get('Feedback');
    });
  });

  afterEach(done => {
    clock.restore();
    done();
  });

  it('unhandled error submits feedback', done => {
    post.callsArgWith(1);

    service.init({
      console: mockConsole,
      window: mockWindow
    });

    mockConsole.log('Trying to save');
    mockConsole.info('Saving in process');
    mockConsole.warn('Saving taking a while');
    mockConsole.error('Failed to save', '404');

    service.submit({ message: 'hello world' }, true, () => {
      chai.expect(post.callCount).to.equal(1);
      const submittedDoc = post.args[0][0];

      chai.expect(submittedDoc.type).to.equal('feedback');
      chai.expect(submittedDoc.info.message).to.equal('hello world');
      chai.expect(submittedDoc.meta.user.name).to.equal('fred');
      chai.expect(submittedDoc.meta.app).to.equal('medic');
      chai.expect(submittedDoc.meta.version).to.equal('0.5.0');
      chai.expect(submittedDoc.meta.time).to.equal('1970-01-01T00:00:00.000Z');
      
      chai.expect(submittedDoc.log.length).to.equal(4);
      chai.expect(submittedDoc.log[0].level).to.equal('error');
      chai.expect(submittedDoc.log[0].arguments).to.equal('{"0":"Failed to save","1":"404"}');
      chai.expect(submittedDoc.log[1].level).to.equal('warn');
      chai.expect(submittedDoc.log[1].arguments).to.equal('{"0":"Saving taking a while"}');
      chai.expect(submittedDoc.log[2].level).to.equal('info');
      chai.expect(submittedDoc.log[2].arguments).to.equal('{"0":"Saving in process"}');
      chai.expect(submittedDoc.log[3].level).to.equal('log');
      chai.expect(submittedDoc.log[3].arguments).to.equal('{"0":"Trying to save"}');

      done();
    });
  });

  it('log history restricted to 20 lines', done => {
    post.callsArgWith(1);

    service.init({
      console: mockConsole,
      window: mockWindow
    });

    for (let i = 0; i < 25; i++) {
      mockConsole.log('item ' + i);
    }

    service.submit({ message: 'hello world' }, true, () => {
      chai.expect(post.callCount).to.equal(1);

      const submittedDoc = post.args[0][0];
      chai.expect(submittedDoc.log.length).to.equal(20);
      chai.expect(submittedDoc.log[0].arguments).to.equal('{"0":"item 24"}');
      chai.expect(submittedDoc.log[19].arguments).to.equal('{"0":"item 5"}');

      done();
    });
  });

  it('password in URL is blanked out', done => {
    post.callsArgWith(1);

    service.init({
      console: mockConsole,
      window: mockWindow,
      document: mockDocument
    });

    mockDocument.URL = 'http://gareth:SUPERSECRET!@somewhere.com';

    service.submit({ message: 'hello world' }, true, () => {
      chai.expect(post.callCount).to.equal(1);
      const submittedDoc = post.args[0][0];

      chai.expect(submittedDoc.meta.url).to.equal('http://gareth:********@somewhere.com');
      chai.expect(submittedDoc.meta.app).to.equal('medic');
      chai.expect(submittedDoc.meta.version).to.equal('0.5.0');
      chai.expect(submittedDoc.meta.time).to.equal('1970-01-01T00:00:00.000Z');

      done();
    });
  });
  
});