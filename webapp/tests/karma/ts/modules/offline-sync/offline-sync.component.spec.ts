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
import { DeviceKeyService } from '@mm-services/device-key.service';
import { OfflineSyncBundleStoreService } from '@mm-services/offline-sync-bundle-store.service';
import { OfflineSyncResult, OfflineSyncService } from '@mm-services/offline-sync.service';
import { OfflineSyncTransferService } from '@mm-services/offline-sync-transfer.service';

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
  let bundleStoreService;
  let deviceKeyService;
  let transferService;
  let hostingResult: Subject<OfflineSyncResult>;
  let pairingResult: Subject<OfflineSyncResult>;
  let permissionsResolved: Subject<boolean>;
  let bundleReceived: Subject<string>;

  // ngOnInit is awaited by create(), so a test that holds the count open starts create() without
  // awaiting it and waits here for the count to have been asked for.
  const untilCounted = async () => {
    while (!bundleStoreService.count.called) {
      await new Promise(resolve => setTimeout(resolve));
    }
  };
  const tick = () => new Promise(resolve => setTimeout(resolve));

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
        { provide: OfflineSyncBundleStoreService, useValue: bundleStoreService },
        { provide: DeviceKeyService, useValue: deviceKeyService },
        { provide: OfflineSyncTransferService, useValue: transferService },
      ],
    });
    TestBed.overrideComponent(OfflineSyncComponent, {
      remove: { imports: [ToolBarComponent] },
      add: { imports: [StubToolBarComponent] },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(OfflineSyncComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(() => {
    hostingResult = new Subject<OfflineSyncResult>();
    pairingResult = new Subject<OfflineSyncResult>();
    permissionsResolved = new Subject<boolean>();
    feedbackService = { submit: sinon.stub().resolves() };
    bundleReceived = new Subject<string>();
    deviceKeyService = { getKeyMaterial: sinon.stub().resolves({ deviceId: 'device-1' }) };
    bundleStoreService = { collect: sinon.stub().resolves(1), count: sinon.stub().resolves(0) };
    transferService = { handOver: sinon.stub().resolves({ delivered: 2, skipped: 0 }) };
    offlineSyncService = {
      isSupported: sinon.stub().returns(true),
      deviceDescription: sinon.stub().returns('Pixel 7, Android 14 (API 34)'),
      canHost: sinon.stub().resolves(true),
      canJoin: sinon.stub().resolves(true),
      hostingSession: sinon.stub().returns(null),
      hostingResult: () => hostingResult.asObservable(),
      pairingResult: () => pairingResult.asObservable(),
      permissionsResolved: () => permissionsResolved.asObservable(),
      bundleReceived: () => bundleReceived.asObservable(),
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
      expect(component.canJoin).to.be.false;
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

    it('shows the session still running when the user comes back to the page', async () => {
      await create({ hostingSession: sinon.stub().returns(HOSTING_SESSION) });

      expect(component.state).to.equal('hosting');
      expect(component.qrImage).to.equal(HOSTING_SESSION.qr);
      expect(component.ssid).to.equal(HOSTING_SESSION.ssid);
      expect(component.password).to.equal(HOSTING_SESSION.password);
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

  describe('handing data over', () => {
    const pair = async () => {
      pairingResult.next({ ok: true, detail: 'Supervisor phone' });
      await fixture.whenStable();
    };

    it('sends everything the server has not received unless the user chooses otherwise', async () => {
      await create();
      await pair();

      await component.send();

      expect(transferService.handOver.args).to.deep.equal([['sync']]);
      expect(component.state).to.equal('sent');
      expect(component.delivered).to.equal(2);
    });

    it('sends only what is new when the user asks for that', async () => {
      await create();
      await pair();
      component.scope = 'export';

      await component.send();

      expect(transferService.handOver.args).to.deep.equal([['export']]);
    });

    // A handover that stops leaves data on the phone, so saying nothing would be a lie.
    it('turns a transfer failure into a translation key', async () => {
      await create();
      await pair();
      transferService.handOver.rejects(new Error('transfer_failed'));

      await component.send();

      expect(component.state).to.equal('failed');
      expect(component.errorKey).to.equal('offline_sync.error.transfer_failed');
    });

    it('shows what it is already carrying when the screen opens', async () => {
      bundleStoreService.count.resolves(6);

      await create();

      expect(component.carrying).to.equal(6);
    });

    it('collects a bundle a peer has just delivered', async () => {
      bundleStoreService.count.onSecondCall().resolves(1);
      await create();

      bundleReceived.next('bundle-1');
      await new Promise(resolve => setTimeout(resolve));

      expect(bundleStoreService.collect.callCount).to.equal(1);
      expect(component.carrying).to.equal(1);
    });

    // The peer keeps the bundle and it is collected again, so a session that is otherwise working
    // must not be torn down over it.
    it('keeps the session when a delivered bundle cannot be collected', async () => {
      await create();
      bundleStoreService.collect.rejects(new Error('no space'));

      bundleReceived.next('bundle-1');
      await fixture.whenStable();

      expect(component.state).to.not.equal('failed');
      expect(component.carrying).to.equal(0);
      // Asserted through the rendered page, not the field: a message the template never shows is
      // the same as no message at all to the supervisor whose phone is full.
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.offline-sync-warning').textContent)
        .to.contain('offline_sync.error.bundle_store_failed');
    });

    it('stays usable when the carried bundles cannot be counted', async () => {
      bundleStoreService.count.rejects(new Error('no space'));
      await create();

      expect(component.loading).to.be.false;
      expect(component.errorKey).to.equal('offline_sync.error.bundle_store_unreadable');
      hostingResult.next({ ok: true, detail: '', session: HOSTING_SESSION });
      expect(component.state).to.equal('hosting');
    });

    it('is usable and listening while the carried bundles are still being counted', async () => {
      let finishCount;
      bundleStoreService.count.returns(new Promise(resolve => finishCount = resolve));
      const created = create();
      await untilCounted();

      expect(component.loading).to.be.false;
      hostingResult.next({ ok: true, detail: '', session: HOSTING_SESSION });
      expect(component.state).to.equal('hosting');

      finishCount(3);
      await created;
      expect(component.carrying).to.equal(3);
    });

    it('keeps the failure the user is looking at when a count fails after it', async () => {
      let failCount;
      bundleStoreService.count.returns(new Promise((resolve, reject) => failCount = reject));
      const created = create();
      await untilCounted();

      hostingResult.next({ ok: false, detail: 'hotspot_tethering_disallowed' });
      failCount(new Error('unreadable'));
      await created;

      expect(component.errorKey).to.equal('offline_sync.error.hotspot_tethering_disallowed');
    });

    it('ignores a count that fails after a newer one succeeded', async () => {
      let failFirstCount;
      bundleStoreService.count.onFirstCall().returns(new Promise((resolve, reject) => failFirstCount = reject));
      bundleStoreService.count.onSecondCall().resolves(1);
      const created = create();
      await untilCounted();

      bundleReceived.next('bundle-1');
      await tick();
      failFirstCount(new Error('unreadable'));
      await created;

      expect(component.carrying).to.equal(1);
      expect(component.errorKey).to.be.null;
    });

    it('keeps a delivery failure when an older count fails after it', async () => {
      let failFirstCount;
      bundleStoreService.count.onFirstCall().returns(new Promise((resolve, reject) => failFirstCount = reject));
      bundleStoreService.collect.rejects(new Error('no space'));
      const created = create();
      await untilCounted();

      bundleReceived.next('bundle-1');
      await tick();
      failFirstCount(new Error('unreadable'));
      await created;

      expect(component.errorKey).to.equal('offline_sync.error.bundle_store_failed');
    });

    it('clears the read warning once a count succeeds', async () => {
      bundleStoreService.count.onFirstCall().rejects(new Error('unreadable'));
      bundleStoreService.count.onSecondCall().resolves(1);
      await create();
      expect(component.errorKey).to.equal('offline_sync.error.bundle_store_unreadable');

      bundleReceived.next('bundle-1');
      await tick();

      expect(component.errorKey).to.be.null;
      expect(component.carrying).to.equal(1);
    });

    it('shows the latest count when an older one answers last', async () => {
      let finishFirstCount;
      bundleStoreService.count.onFirstCall().returns(new Promise(resolve => finishFirstCount = resolve));
      bundleStoreService.count.onSecondCall().resolves(1);
      const created = create();
      await untilCounted();

      bundleReceived.next('bundle-1');
      await new Promise(resolve => setTimeout(resolve));
      finishFirstCount(0);
      await created;

      expect(component.carrying).to.equal(1);
    });
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
      expect(fixture.nativeElement.querySelector('.mat-mdc-card button')).to.not.be.null;

      component.startOver();
      fixture.detectChanges();

      expect(component.state).to.equal('idle');
      expect(component.errorKey).to.be.null;
    });

    // Granting the permission is exactly what the failure asked for, so the screen should not still
    // be showing it.
    it('clears the failure once the user grants the permission', async () => {
      await create();
      hostingResult.next({ ok: false, detail: 'permissions_required' });
      await fixture.whenStable();

      permissionsResolved.next(true);
      await fixture.whenStable();

      expect(component.state).to.equal('idle');
    });

    it('goes back to the start when the user cancels the scan, and records nothing', async () => {
      await create();
      component.scanAndJoin();

      pairingResult.next({ ok: false, detail: 'scan_cancelled' });

      expect(component.state).to.equal('idle');
      expect(component.errorKey).to.be.null;
      expect(feedbackService.submit.callCount).to.equal(0);
    });

    it('explains the permission prompt without recording it as a failure', async () => {
      await create();

      hostingResult.next({ ok: false, detail: 'permissions_required' });

      expect(component.errorKey).to.equal('offline_sync.error.permissions_required');
      expect(feedbackService.submit.callCount).to.equal(0);
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

  describe('being ready to send', () => {
    // The key only arrives on a successful sync. Finding that out when she taps send means finding
    // out in the field, where the only fix is back where she came from.
    it('warns before she leaves that the phone cannot send yet', async () => {
      deviceKeyService.getKeyMaterial.resolves(null);

      await create();
      fixture.detectChanges();

      expect(component.ready).to.be.false;
      expect(fixture.nativeElement.querySelector('.offline-sync-not-ready')).to.not.be.null;
    });

    it('stays usable when the device keys cannot be read', async () => {
      deviceKeyService.getKeyMaterial.rejects(new Error('unreadable'));

      await create();

      expect(component.loading).to.be.false;
      expect(component.ready).to.be.false;
    });

    it('says nothing once the phone has its key', async () => {
      await create();
      fixture.detectChanges();

      expect(component.ready).to.be.true;
      expect(fixture.nativeElement.querySelector('.offline-sync-not-ready')).to.be.null;
    });

    // A relay does not seal anything, so it has no key and must not be told it is not ready.
    it('does not warn a device that only relays', async () => {
      deviceKeyService.getKeyMaterial.resolves(null);

      await create({ canJoin: sinon.stub().resolves(false) });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.offline-sync-not-ready')).to.be.null;
    });
  });
});
