import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { Store } from '@ngrx/store';
import sinon from 'sinon';
import { expect } from 'chai';

import { BrowserDetectorService } from '@mm-services/browser-detector.service';

type StoreSelectFn = Store['select'];
type StubbedStore = { select: sinon.SinonStub<any, ReturnType<StoreSelectFn>> };

const baseUserAgent = navigator.userAgent;

const spoofUserAgent = (userAgent: string) => {
  Object.defineProperty(window.navigator, 'userAgent', {
    get: () => userAgent,
    configurable: true,
  });
};

const restoreUserAgent = () => spoofUserAgent(baseUserAgent);

const getChtAndroidUserAgent = (androidAppVersion: string, webviewVersion = '80.0.3987') =>
  'Mozilla/5.0 (Linux; Android 5.1.1; One S Build/LMY49J; wv) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 ' +
  `Chrome/${webviewVersion} Mobile Safari/537.36 ` +
  `org.medicmobile.webapp.mobile/${androidAppVersion}`;

describe('Browser Detector Service', () => {
  let service: BrowserDetectorService;
  let store: StubbedStore;
  let androidAppVersion: Subject<string>;

  beforeEach(() => {
    androidAppVersion = new Subject();
    store = { select: sinon.stub().returns(androidAppVersion) };
    TestBed.configureTestingModule({
      providers: [
        { provide: Store, useValue: store },
      ],
    });

    service = TestBed.inject(BrowserDetectorService);
  });

  afterEach(() => {
    sinon.restore();
    restoreUserAgent();
  });

  it('runs with cht-android v1 and webview v80', () => {
    const chtAndroidVersion = 'v1.0.1-alpha.1';
    spoofUserAgent(getChtAndroidUserAgent(chtAndroidVersion));
    androidAppVersion.next(chtAndroidVersion);

    expect(service.isUsingSupportedBrowser()).to.be.true;
    expect(service.isUsingChtAndroid()).to.be.true;
    expect(service.isUsingChtAndroidV1()).to.be.true;
  });

  it('runs with cht-android v1 and an unsupported webview version', () => {
    const chtAndroidVersion = 'v1.0.0';
    spoofUserAgent(getChtAndroidUserAgent(chtAndroidVersion, '52.0.2743.116'));
    androidAppVersion.next(chtAndroidVersion);

    expect(service.isUsingSupportedBrowser()).to.be.false;
    expect(service.isUsingChtAndroid()).to.be.true;
    expect(service.isUsingChtAndroidV1()).to.be.true;
  });

  it('runs with cht-android v0.11 and webview v80', () => {
    const chtAndroidVersion = 'v0.11.1';
    spoofUserAgent(getChtAndroidUserAgent(chtAndroidVersion));
    androidAppVersion.next(chtAndroidVersion);

    expect(service.isUsingSupportedBrowser()).to.be.true;
    expect(service.isUsingChtAndroid()).to.be.true;
    expect(service.isUsingChtAndroidV1()).to.be.false;
  });

  it('runs with a dev build of cht-android and webview v80', () => {
    const chtAndroidVersion = 'SNAPSHOT';
    spoofUserAgent(getChtAndroidUserAgent(chtAndroidVersion));
    androidAppVersion.next(chtAndroidVersion);

    expect(service.isUsingSupportedBrowser()).to.be.true;
    expect(service.isUsingChtAndroid()).to.be.true;
    expect(service.isUsingChtAndroidV1()).to.be.false;
  });

  it('runs with the local chrome', () => {
    expect(service.isUsingSupportedBrowser()).to.be.true;
    expect(service.isUsingChtAndroid()).to.be.false;
    expect(service.isUsingChtAndroidV1()).to.be.false;
  });
});
