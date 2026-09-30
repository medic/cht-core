import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';

import { AuthService } from '@mm-services/auth.service';
import { OfflineSyncService } from '@mm-services/offline-sync.service';

describe('OfflineSync service', () => {
  let service: OfflineSyncService;
  let authService;

  const bridge = (overrides:any = {}) => ({
    offline_sync_host_available: sinon.stub().returns(true),
    offline_sync_join_available: sinon.stub().returns(true),
    offline_sync_start_hosting: sinon.stub(),
    offline_sync_stop_hosting: sinon.stub(),
    offline_sync_is_hosting: sinon.stub().returns(false),
    offline_sync_scan_and_join: sinon.stub(),
    offline_sync_leave_session: sinon.stub(),
    ...overrides,
  });

  const withBridge = (impl) => {
    (window as any).medicmobile_android = impl;
  };

  beforeEach(() => {
    authService = { has: sinon.stub().resolves(true) };
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authService }],
    });
    service = TestBed.inject(OfflineSyncService);
  });

  afterEach(() => {
    delete (window as any).medicmobile_android;
    sinon.restore();
  });

  describe('availability', () => {
    it('is unsupported in a browser, where there is no bridge', async () => {
      expect(service.isSupported()).to.be.false;
      expect(await service.canHost()).to.be.false;
      expect(await service.canJoin()).to.be.false;
    });

    it('is unsupported when the bridge predates these methods', async () => {
      withBridge({ getAppVersion: sinon.stub() });

      expect(service.isSupported()).to.be.false;
      expect(await service.canHost()).to.be.false;
    });

    it('allows hosting for a user who may relay, on a device that can host', async () => {
      withBridge(bridge());

      expect(await service.canHost()).to.be.true;
      expect(authService.has.calledWith('can_relay_offline_data_bundle')).to.be.true;
    });

    it('allows joining for a user who may send, on a device that can join', async () => {
      withBridge(bridge());

      expect(await service.canJoin()).to.be.true;
      expect(authService.has.calledWith('can_send_offline_data_bundle')).to.be.true;
    });

    it('refuses hosting without the permission, even on a capable device', async () => {
      withBridge(bridge());
      authService.has.resolves(false);

      expect(await service.canHost()).to.be.false;
    });

    /** An older phone can still send its own data, so the two answers are independent. */
    it('allows joining on a device that cannot host', async () => {
      withBridge(bridge({ offline_sync_host_available: sinon.stub().returns(false) }));

      expect(await service.canHost()).to.be.false;
      expect(await service.canJoin()).to.be.true;
    });

    it('does not ask for the permission when the device cannot do it anyway', async () => {
      withBridge(bridge({ offline_sync_host_available: sinon.stub().returns(false) }));

      await service.canHost();

      expect(authService.has.calledWith('can_relay_offline_data_bundle')).to.be.false;
    });
  });

  describe('session control', () => {
    it('passes hosting calls through to the bridge', () => {
      const android = bridge();
      withBridge(android);

      service.startHosting();
      service.stopHosting();

      expect(android.offline_sync_start_hosting.callCount).to.equal(1);
      expect(android.offline_sync_stop_hosting.callCount).to.equal(1);
    });

    it('passes joining calls through to the bridge', () => {
      const android = bridge();
      withBridge(android);

      service.scanAndJoin();
      service.leaveSession();

      expect(android.offline_sync_scan_and_join.callCount).to.equal(1);
      expect(android.offline_sync_leave_session.callCount).to.equal(1);
    });

    /** In a browser these are no-ops rather than crashes, so the page still renders. */
    it('does nothing without a bridge', () => {
      expect(() => service.startHosting()).to.not.throw();
      expect(() => service.scanAndJoin()).to.not.throw();
      expect(service.isHosting()).to.be.false;
    });
  });

  describe('results from the native side', () => {
    it('emits the hosting result with the network the peer must join', (done) => {
      const session = { qr: 'data:image/png;base64,abc', ssid: 'AndroidShare_1234', password: 'a-pwd' };
      service.hostingResult().subscribe(result => {
        expect(result.ok).to.be.true;
        expect(result.session).to.deep.equal(session);
        done();
      });

      service.hostingResolved(true, JSON.stringify(session));
    });

    /** Nothing to put on screen, so this is a failure rather than an empty hosting card. */
    it('reports a session it cannot read as a failure', (done) => {
      service.hostingResult().subscribe(result => {
        expect(result.ok).to.be.false;
        expect(result.detail).to.equal('payload_failed');
        done();
      });

      service.hostingResolved(true, 'not json');
    });

    it('emits a hosting failure with its code', (done) => {
      service.hostingResult().subscribe(result => {
        expect(result).to.deep.equal({ ok: false, detail: 'hotspot_unsupported', diagnostic: undefined });
        done();
      });

      service.hostingResolved(false, 'hotspot_unsupported');
    });

    it('emits the pairing result', (done) => {
      service.pairingResult().subscribe(result => {
        expect(result).to.deep.equal({ ok: true, detail: 'Supervisor phone' });
        done();
      });

      service.pairingResolved(true, 'Supervisor phone');
    });

    it('emits when the permission prompt has been answered', (done) => {
      service.permissionsResolved().subscribe(granted => {
        expect(granted).to.be.false;
        done();
      });

      service.permissionsResolvedBy(false);
    });
  });
});
