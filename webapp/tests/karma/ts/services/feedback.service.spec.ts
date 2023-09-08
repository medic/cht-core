import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { FeedbackService } from '@mm-services/feedback.service';
import { VersionService } from '@mm-services/version.service';
import { SessionService } from '@mm-services/session.service';
import { DbService } from '@mm-services/db.service';
import { LanguageService } from '@mm-services/language.service';
import { resolve } from '@angular/compiler-cli';

describe('Feedback service', () => {
  let clock;
  let post;
  let mockConsole;
  let mockWindow;
  let mockDocument;
  let getLocal;
  let service:FeedbackService;
  let languageService;

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
    languageService = { get: sinon.stub() };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: { get: () => ({ post }) } },
        { provide: VersionService, useValue: { getLocal } },
        { provide: SessionService, useValue: { userCtx: () => ({ name: 'fred' }) } },
        { provide: LanguageService, useValue: languageService }
      ]
    });

    service = TestBed.inject(FeedbackService);
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
  });

  it('should submit feedback when there is an unhandled error', async () => {
    post.resolves();
    getLocal.resolves(({ version: '0.5.0' }));
    languageService.get.resolves('es');
    service._setOptions({
      console: mockConsole,
      window: mockWindow,
      document: mockDocument
    });
    service.init();

    // JSON.stringify(new Error('foo')) yields {} by default
    mockConsole.log(new Error('msg'));
    mockConsole.log('Trying to save');
    mockConsole.info('Saving in process');
    mockConsole.warn('Saving taking a while');
    mockConsole.error('Failed to save', '404');

    await service.submit({ message: 'hello world' });

    expect(post.callCount).to.equal(2);
    const submittedDoc = post.args[0][0];

    expect(submittedDoc.type).to.equal('feedback');
    expect(submittedDoc.info.message).to.equal('Failed to save');
    expect(submittedDoc.meta.user.name).to.equal('fred');
    expect(submittedDoc.meta.language).to.equal('es');
    expect(submittedDoc.meta.version).to.equal('0.5.0');
    expect(submittedDoc.meta.time).to.equal('1970-01-01T00:00:00.000Z');
    expect(submittedDoc.meta.source).to.equal('automatic');

    expect(submittedDoc.log.length).to.equal(5);
    expect(submittedDoc.log[0].level).to.equal('error');
    expect(submittedDoc.log[0].arguments).to.equal('["Failed to save","404"]');
    expect(submittedDoc.log[1].level).to.equal('warn');
    expect(submittedDoc.log[1].arguments).to.equal('["Saving taking a while"]');
    expect(submittedDoc.log[2].level).to.equal('info');
    expect(submittedDoc.log[2].arguments).to.equal('["Saving in process"]');
    expect(submittedDoc.log[3].level).to.equal('log');
    expect(submittedDoc.log[3].arguments).to.equal('["Trying to save"]');
    expect(submittedDoc.log[4].level).to.equal('log');
    expect(submittedDoc.log[4].arguments).to.include('msg');
  });

  it('should log history restricted to 20 lines', async () => {
    post.resolves();
    getLocal.resolves(({ version: '0.5.0' }));
    languageService.get.resolves('en');
    service.init();
    service._setOptions({
      console: mockConsole,
      window: mockWindow,
      document: mockDocument
    });

    for (let i = 0; i < 25; i++) {
      mockConsole.log('item ' + i);
    }

    await service.submit({ message: 'hello world' }, true);

    expect(post.calledOnce).to.be.true;
    const submittedDoc = post.args[0][0];
    expect(submittedDoc.log.length).to.equal(20);
    expect(submittedDoc.log[0].arguments).to.equal('["item 24"]');
    expect(submittedDoc.log[19].arguments).to.equal('["item 5"]');
    expect(submittedDoc.meta.source).to.equal('manual');
    expect(submittedDoc.meta.language).to.equal('en');
  });

  it('should blank out password in URL', async () => {
    post.resolves();
    getLocal.resolves(({ version: '0.5.0' }));
    mockDocument.URL = 'http://gareth:SUPERSECRET!@somewhere.com';
    languageService.get.resolves('en');
    service.init();
    service._setOptions({
      console: mockConsole,
      window: mockWindow,
      document: mockDocument
    });

    await service.submit({ message: 'hello world' });

    expect(post.calledOnce).to.be.true;
    const submittedDoc = post.args[0][0];
    expect(submittedDoc.meta.url).to.equal('http://gareth:********@somewhere.com');
    expect(submittedDoc.meta.language).to.equal('en');
    expect(submittedDoc.meta.version).to.equal('0.5.0');
    expect(submittedDoc.meta.time).to.equal('1970-01-01T00:00:00.000Z');
  });

  it('should record device id in feedback doc', async () => {
    post.resolves();
    getLocal.resolves(({ version: '0.5.0' }));
    languageService.get.resolves('en');
    service.init();
    service._setOptions({
      console: mockConsole,
      window: mockWindow,
      document: mockDocument
    });

    await service.submit({ message: 'hello world' }, true);

    expect(post.calledOnce).to.be.true;
    const submittedDoc = post.args[0][0];
    expect(submittedDoc.meta.source).to.equal('manual');
    expect(submittedDoc.meta.language).to.equal('en');
    expect(submittedDoc.meta.deviceId).to.exist;
  });

});
