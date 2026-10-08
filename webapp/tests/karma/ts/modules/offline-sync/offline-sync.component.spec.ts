import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { Subject } from 'rxjs';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { ToolBarComponent } from '@mm-components/tool-bar/tool-bar.component';

import { OfflineSyncComponent } from '@mm-modules/offline-sync/offline-sync.component';
import { FeedbackService } from '@mm-services/feedback.service';
import { OfflineSyncResult, OfflineSyncService } from '@mm-services/offline-sync.service';

/**
 * The real toolbar reaches the session, the database and PouchDB, none of which this component
 * touches. Standing in for it keeps the test about pairing.
 */
@Component({ selector: 'mm-tool-bar', template: '', standalone: true })
class StubToolBarComponent { }

const HOSTING_SESSION = {
  qr: 'data:image/png;base64,abc',
  ssid: 'AndroidShare_1234',
  password: 'a-password',
};

describe('OfflineSync component', () => {
  let component: OfflineSyncComponent;
  let fixture: ComponentFixture<OfflineSyncComponent>;
  let offlineSyncService;
  let feedbackService;
  let hostingResult: Subject<OfflineSyncResult>;
  let pairingResult: Subject<OfflineSyncResult>;
  let permissionsResolved: Subject<boolean>;

  const create = async (overrides:any = {}) => {
    Object.assign(offlineSyncService, overrides);
    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        BrowserAnimationsModule,
        OfflineSyncComponent,
      ],
      providers: [
        { provide: OfflineSyncService, useValue: offlineSyncService },
        { provide: FeedbackService, useValue: feedbackService },
      ],
    });
    TestBed.overrideComponent(OfflineSyncComponent, {
      remove: { imports: [ToolBarComponent] },
      add: { imports: [StubToolBarComponent] },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(OfflineSyncComponent);
    component = fixture.componentInstance;
    await component.ngOnInit();
  };

  beforeEach(() => {
    hostingResult = new Subject<OfflineSyncResult>();
    pairingResult = new Subject<OfflineSyncResult>();
    permissionsResolved = new Subject<boolean>();
    feedbackService = { submit: sinon.stub().resolves() };
    offlineSyncService = {
      isSupported: sinon.stub().returns(true),
      deviceDescription: sinon.stub().returns('Pixel 7, Android 14 (API 34)'),
      canHost: sinon.stub().resolves(true),
      canJoin: sinon.stub().resolves(true),
      hostingResult: () => hostingResult.asObservable(),
      pairingResult: () => pairingResult.asObservable(),
      permissionsResolved: () => permissionsResolved.asObservable(),
      startHosting: sinon.stub(),
      stopHosting: sinon.stub(),
      scanAndJoin: sinon.stub(),
      leaveSession: sinon.stub(),
    };
  });

  afterEach(() => sinon.restore());

  describe('what the user is offered', () => {
    it('offers nothing outside the android app', async () => {
      await create({
        isSupported: sinon.stub().returns(false),
        canHost: sinon.stub().resolves(false),
        canJoin: sinon.stub().resolves(false),
      });

      expect(component.supported).to.be.false;
      expect(component.canHost).to.be.false;
    });

    /** A device can be able to send but not receive, so the two are asked separately. */
    it('offers only joining on a device that cannot host', async () => {
      await create({ canHost: sinon.stub().resolves(false) });

      expect(component.canHost).to.be.false;
      expect(component.canJoin).to.be.true;
    });

    it('stops showing the loading card once it knows', async () => {
      await create();

      expect(component.loading).to.be.false;
    });
  });

  describe('hosting', () => {
    it('shows the code once the session is ready', async () => {
      await create();

      component.startHosting();
      expect(component.state).to.equal('starting');

      hostingResult.next({ ok: true, detail: '', session: HOSTING_SESSION });

      expect(component.state).to.equal('hosting');
      expect(component.qrImage).to.equal('data:image/png;base64,abc');
    });

    it('shows the network beside the code, for a peer that cannot scan', async () => {
      await create();

      component.startHosting();
      hostingResult.next({ ok: true, detail: '', session: HOSTING_SESSION });
      fixture.detectChanges();

      const network = fixture.nativeElement.querySelector('.offline-sync-network');
      expect(network).to.not.be.null;
      expect(network.textContent).to.include(HOSTING_SESSION.ssid);
      expect(network.textContent).to.include(HOSTING_SESSION.password);
    });

    it('turns a failure code into a translation key, never raw text', async () => {
      await create();

      component.startHosting();
      hostingResult.next({ ok: false, detail: 'hotspot_unsupported' });

      expect(component.state).to.equal('failed');
      expect(component.errorKey).to.equal('offline_sync.error.hotspot_unsupported');
      expect(component.qrImage).to.be.null;
    });

    it('records the failure, since a hotspot that will not start never reaches the server', async () => {
      await create();

      component.startHosting();
      hostingResult.next({ ok: false, detail: 'hotspot_tethering_disallowed' });

      expect(feedbackService.submit.callCount).to.equal(1);
      expect(feedbackService.submit.args[0][0].message)
        .to.equal('Offline sync failed: hotspot_tethering_disallowed [Pixel 7, Android 14 (API 34)]');
    });

    it('records the diagnostic native sends with the failure', async () => {
      await create();

      component.startHosting();
      hostingResult.next({ ok: false, detail: 'certificate_failed', diagnostic: 'KeyStoreException: NONE' });

      expect(feedbackService.submit.args[0][0].message)
        .to.equal('Offline sync failed: certificate_failed [Pixel 7, Android 14 (API 34)] KeyStoreException: NONE');
    });

    it('falls back to a real message for a code it does not know', async () => {
      await create();

      hostingResult.next({ ok: false, detail: '' });

      expect(component.errorKey).to.equal('offline_sync.error.unknown');
    });

    it('clears the code when hosting stops', async () => {
      await create();
      component.startHosting();
      hostingResult.next({ ok: true, detail: '', session: HOSTING_SESSION });

      component.stopHosting();

      expect(offlineSyncService.stopHosting.callCount).to.equal(1);
      expect(component.state).to.equal('idle');
      expect(component.qrImage).to.be.null;
    });
  });

  describe('joining', () => {
    it('names the host it connected to, so the user can check it', async () => {
      await create();

      component.scanAndJoin();
      expect(component.state).to.equal('joining');

      pairingResult.next({ ok: true, detail: 'Supervisor phone' });

      expect(component.state).to.equal('paired');
      expect(component.hostLabel).to.equal('Supervisor phone');
    });

    /** The security-critical one: the user must be told, not quietly left connected. */
    it('reports a host that could not be verified', async () => {
      await create();

      component.scanAndJoin();
      pairingResult.next({ ok: false, detail: 'host_not_verified' });

      expect(component.state).to.equal('failed');
      expect(component.errorKey).to.equal('offline_sync.error.host_not_verified');
      expect(component.hostLabel).to.be.null;
    });

    it('clears the session when the user disconnects', async () => {
      await create();
      component.scanAndJoin();
      pairingResult.next({ ok: true, detail: 'Supervisor phone' });

      component.leaveSession();

      expect(offlineSyncService.leaveSession.callCount).to.equal(1);
      expect(component.state).to.equal('idle');
      expect(component.hostLabel).to.be.null;
    });
  });

  it('stops listening when it goes away', async () => {
    await create();

    component.ngOnDestroy();
    hostingResult.next({ ok: true, detail: '', session: HOSTING_SESSION });

    expect(component.state).to.equal('idle');
  });

  describe('recovering from a failure', () => {
    // Every failure message tells the user to try again, and the start and scan buttons only render
    // while idle, so without this the only way out is to navigate away.
    it('offers a way back after a failure', async () => {
      await create();
      hostingResult.next({ ok: false, detail: 'server_start_failed' });
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.state).to.equal('failed');
      const retry = fixture.nativeElement.querySelector('.mat-mdc-card button');
      expect(retry).to.not.be.null;

      component.startOver();
      fixture.detectChanges();

      expect(component.state).to.equal('idle');
      expect(component.errorKey).to.be.null;
    });

    // The native side asks for the permission and reports the answer; granting it is exactly what
    // the failure asked for, so the screen should not still be showing the failure.
    it('clears the failure once the user grants the permission', async () => {
      await create();
      hostingResult.next({ ok: false, detail: 'permissions_required' });
      await fixture.whenStable();

      permissionsResolved.next(true);
      await fixture.whenStable();

      expect(component.state).to.equal('idle');
    });

    it('leaves the failure showing when the user refuses', async () => {
      await create();
      hostingResult.next({ ok: false, detail: 'permissions_required' });
      await fixture.whenStable();

      permissionsResolved.next(false);
      await fixture.whenStable();

      expect(component.state).to.equal('failed');
    });
  });
});
