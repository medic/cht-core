import { ComponentFixture, fakeAsync, flush, discardPeriodicTasks, TestBed, waitForAsync } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { MatCardModule } from '@angular/material/card';
import { expect } from 'chai';
import sinon from 'sinon';

import { AboutComponent } from '@mm-modules/about/about.component';
import { ResourceIconsService } from '@mm-services/resource-icons.service';
import { SessionService } from '@mm-services/session.service';
import { VersionService } from '@mm-services/version.service';
import { DbService } from '@mm-services/db.service';
import { Selectors } from '@mm-selectors/index';

describe('About Component', () => {
  let component:AboutComponent;
  let fixture:ComponentFixture<AboutComponent>;
  let dbService;
  let resourceIconsService;
  let sessionService;
  let versionService;
  let dbInfo;
  let router;
  let medicAndroid;
  const originalMedicAndroid = window.medicmobile_android;

  beforeEach(waitForAsync(() => {
    const mockedSelectors = [
      { selector: Selectors.getReplicationStatus, value: {} },
    ];

    versionService = {
      getLocal: sinon.stub().resolves('123'),
      getRemoteRev: sinon.stub().resolves('456'),
    };

    dbInfo = sinon.stub().resolves('db-info');
    dbService = { get: sinon.stub().returns({ info: dbInfo }) };
    resourceIconsService = { getDocResources: sinon.stub().resolves() };
    sessionService = { userCtx: sinon.stub().returns('userctx') };
    router = { navigate: sinon.stub() };

    medicAndroid = {
      getDeviceInfo: sinon.stub(),
      getDataUsage: sinon.stub()
    };
    window.medicmobile_android = undefined;

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
          MatCardModule,
        ],
        declarations: [
          AboutComponent,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: ResourceIconsService, useValue: resourceIconsService },
          { provide: SessionService, useValue: sessionService },
          { provide: VersionService, useValue: versionService },
          { provide: DbService, useValue: dbService },
          { provide: Router, useValue: router }
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(AboutComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    sinon.restore();
    window.medicmobile_android = originalMedicAndroid;
  });

  it('should create About component', () => {
    expect(component).to.exist;
  });

  it('ngOnInit() should subscribe to store', () => {
    const spySubscriptionsAdd = sinon.spy(component.subscription, 'add');

    component.ngOnInit();

    expect(spySubscriptionsAdd.callCount).to.equal(1);
  });

  it('should initialize data when it is not an android device', fakeAsync(() => {
    dbInfo.resolves({ some: 'info' });
    sessionService.userCtx.returns('session info');
    versionService.getLocal.resolves({ version: '3.5.0', rev: '12' });
    versionService.getRemoteRev.resolves('15');

    component.ngOnInit();
    flush();
    discardPeriodicTasks();

    expect(component.dbInfo).to.deep.equal({ some: 'info' });
    expect(component.userCtx).to.equal('session info');
    expect(component.version).to.equal('3.5.0');
    expect(component.localRev).to.equal('12');
    expect(component.remoteRev).to.equal('15');
    expect(component.androidDataUsage).to.be.undefined;
    expect(component.androidDeviceInfo).to.be.undefined;
  }));

  it('should initialize data when the device is android', fakeAsync(() => {
    dbInfo.resolves({ some: 'info' });
    sessionService.userCtx.returns('session info');
    versionService.getLocal.resolves({ version: '3.5.0', rev: '12' });
    versionService.getRemoteRev.resolves('15');
    medicAndroid.getDataUsage.returns(JSON.stringify({
      system: { rx: 124, tx: 345 },
      app: { rx: 124, tx: 345 }
    }));
    medicAndroid.getDeviceInfo.returns(JSON.stringify({
      app: {
        version: 'SNAPSHOT-xwalk',
        packageName: 'org.medicmobile.webapp.mobile',
        versionCode: 201
      },
      software: { androidVersion: '9', osApiLevel: 28 }
    }));
    window.medicmobile_android = medicAndroid;

    component.ngOnInit();
    flush();
    discardPeriodicTasks();

    expect(component.dbInfo).to.deep.equal({ some: 'info' });
    expect(component.userCtx).to.equal('session info');
    expect(component.version).to.equal('3.5.0');
    expect(component.localRev).to.equal('12');
    expect(component.remoteRev).to.equal('15');
    expect(component.androidDataUsage).to.deep.equal({
      system: { rx: 124, tx: 345 },
      app: { rx: 124, tx: 345 }
    });
    expect(component.androidDeviceInfo).to.deep.equal({
      app: {
        version: 'SNAPSHOT-xwalk',
        packageName: 'org.medicmobile.webapp.mobile',
        versionCode: 201
      },
      software: { androidVersion: '9', osApiLevel: 28 }
    });
  }));

  it('should display partner logo if it exists', fakeAsync(() => {
    resourceIconsService.getDocResources.resolves(['Medic']);
    versionService.getLocal.resolves({ version: '3.5.0', rev: '12' });
    versionService.getRemoteRev.resolves('15');

    component.ngOnInit();
    flush();
    discardPeriodicTasks();

    expect(component.partners[0]).to.equal('Medic');
  }));

  it('ngOnDestroy() should unsubscribe from observables', () => {
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscription, 'unsubscribe');

    component.ngOnDestroy();

    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
  });

  it('should handle missing partners resource - #7100', waitForAsync(async () => {
    resourceIconsService.getDocResources.rejects({ status: 404 });
    component.ngOnInit();
    await fixture.whenStable();
    // no error thrown
  }));

  it('should log non 404 errors when getting partners resource - #7100', fakeAsync(() => {
    const consoleErrorMock = sinon.stub(console, 'error');
    resourceIconsService.getDocResources.rejects({ status: 403 });

    component.ngOnInit();
    flush();

    expect(consoleErrorMock.callCount).to.equal(1);
    expect(consoleErrorMock.args[0][0]).to.equal('Error fetching "partners" doc');
  }));

  describe('secretDoor()', () => {
    let setTimeoutStub;
    let clearTimeoutStub;
    let clock;

    beforeEach(() => {
      clock = sinon.useFakeTimers();
      setTimeoutStub = sinon.stub(clock, 'setTimeout').callThrough();
      clearTimeoutStub = sinon.stub(clock, 'clearTimeout').callThrough();
    });

    afterEach(() => {
      clock && clock.restore();
    });

    it('should clear timeout', () => {
      component.secretDoor();

      expect(clearTimeoutStub.callCount).to.equal(0);
      expect(router.navigate.callCount).to.equal(0);
      expect(setTimeoutStub.callCount).to.equal(1);
      expect(component.knockCount).to.equal(1);

      component.secretDoor();

      expect(clearTimeoutStub.callCount).to.equal(1);
      expect(router.navigate.callCount).to.equal(0);
      expect(setTimeoutStub.callCount).to.equal(2);
      expect(component.knockCount).to.equal(2);
    });

    it('should navigate to testing page when knock count reach limit', () => {
      component.knockCount = 5;

      component.secretDoor();

      expect(clearTimeoutStub.callCount).to.equal(0);
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.have.deep.members([['/testing']]);
      expect(setTimeoutStub.callCount).to.equal(0);
      expect(component.knockCount).to.equal(6);
    });

    it('should set zero the knock count after 1 second from the last knock', () => {
      component.knockCount = 4;

      component.secretDoor();

      expect(clearTimeoutStub.callCount).to.equal(0);
      expect(router.navigate.callCount).to.equal(0);
      expect(setTimeoutStub.callCount).to.equal(1);
      expect(component.knockCount).to.equal(5);

      clock.tick(1000);
      expect(component.knockCount).to.equal(0);

      component.secretDoor();

      expect(clearTimeoutStub.callCount).to.equal(1);
      expect(router.navigate.callCount).to.equal(0);
      expect(setTimeoutStub.callCount).to.equal(2);
      expect(component.knockCount).to.equal(1);
    });
  });
});
