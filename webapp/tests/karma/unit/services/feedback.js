describe('Feedback service', () => {

  'use strict';

  let clock;
  let post;
  let mockConsole;
  let mockWindow;
  let mockDocument;
  let getLocal;
  let service;

  beforeEach(() => {
    post = sinon.stub();
    mockDocument = {};
    mockConsole = {
      error: sinon.stub(),
      warn: sinon.stub(),
      info: sinon.stub(),
      log: sinon.stub()
    };
    getLocal = sinon.stub();
    mockWindow = sinon.stub();
    clock = sinon.useFakeTimers();

    module('inboxApp');
    module($provide => {
      $provide.factory('DB', KarmaUtils.mockDB({ post }));
      $provide.value('Version', { getLocal });
      $provide.value('Session', {
        userCtx: () => ({ name: 'fred' })
      });
    });
    inject($injector => {
      service = $injector.get('Feedback');
    });
  });

  afterEach(done => {
    clock.restore();
    done();
  });

  it('unhandled error submits feedback', () => {
    post.resolves();
    getLocal.resolves(({ version: '0.5.0' }));

    service.init();
    service._setOptions({
      console: mockConsole,
      window: mockWindow,
      document: mockDocument
    });

    mockConsole.log('Trying to save');
    mockConsole.info('Saving in process');
    mockConsole.warn('Saving taking a while');
    mockConsole.error('Failed to save', '404');

    return service.submit({ message: 'hello world' }).then(() => {
      chai.expect(post.callCount).to.equal(1);
      const submittedDoc = post.args[0][0];

      chai.expect(submittedDoc.type).to.equal('feedback');
      chai.expect(submittedDoc.info.message).to.equal('hello world');
      chai.expect(submittedDoc.meta.user.name).to.equal('fred');
      chai.expect(submittedDoc.meta.version).to.equal('0.5.0');
      chai.expect(submittedDoc.meta.time).to.equal('1970-01-01T00:00:00.000Z');
      chai.expect(submittedDoc.meta.source).to.equal('automatic');
      
      chai.expect(submittedDoc.log.length).to.equal(4);
      chai.expect(submittedDoc.log[0].level).to.equal('error');
      chai.expect(submittedDoc.log[0].arguments).to.equal('{"0":"Failed to save","1":"404"}');
      chai.expect(submittedDoc.log[1].level).to.equal('warn');
      chai.expect(submittedDoc.log[1].arguments).to.equal('{"0":"Saving taking a while"}');
      chai.expect(submittedDoc.log[2].level).to.equal('info');
      chai.expect(submittedDoc.log[2].arguments).to.equal('{"0":"Saving in process"}');
      chai.expect(submittedDoc.log[3].level).to.equal('log');
      chai.expect(submittedDoc.log[3].arguments).to.equal('{"0":"Trying to save"}');
    });
  });

  it('log history restricted to 20 lines', () => {
    post.resolves();
    getLocal.resolves(({ version: '0.5.0' }));

    service.init();
    service._setOptions({
      console: mockConsole,
      window: mockWindow,
      document: mockDocument
    });

    for (let i = 0; i < 25; i++) {
      mockConsole.log('item ' + i);
    }

    return service.submit({ message: 'hello world' }, true).then(() => {
      chai.expect(post.callCount).to.equal(1);
      const submittedDoc = post.args[0][0];
      chai.expect(submittedDoc.log.length).to.equal(20);
      chai.expect(submittedDoc.log[0].arguments).to.equal('{"0":"item 24"}');
      chai.expect(submittedDoc.log[19].arguments).to.equal('{"0":"item 5"}');
      chai.expect(submittedDoc.meta.source).to.equal('manual');
    });
  });

  it('password in URL is blanked out', () => {
    post.resolves();
    getLocal.resolves(({ version: '0.5.0' }));
    mockDocument.URL = 'http://gareth:SUPERSECRET!@somewhere.com';

    service.init();
    service._setOptions({
      console: mockConsole,
      window: mockWindow,
      document: mockDocument
    });

    return service.submit({ message: 'hello world' }).then(() => {
      chai.expect(post.callCount).to.equal(1);
      const submittedDoc = post.args[0][0];
      chai.expect(submittedDoc.meta.url).to.equal('http://gareth:********@somewhere.com');
      chai.expect(submittedDoc.meta.version).to.equal('0.5.0');
      chai.expect(submittedDoc.meta.time).to.equal('1970-01-01T00:00:00.000Z');
    });
  });
  
});
