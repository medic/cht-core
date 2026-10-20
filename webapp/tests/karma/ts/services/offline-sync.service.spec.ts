import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';

import { AuthService } from '@mm-services/auth.service';
import { OfflineSyncService } from '@mm-services/offline-sync.service';
import { SessionService } from '@mm-services/session.service';

describe('OfflineSync service', () => {
  let service: OfflineSyncService;
  let authService;
  let sessionService;
  let sessionEndHandler;

  const bridge = (overrides:any = {}) => ({
    offline_sync_host_available: sinon.stub().returns(true),
    offline_sync_join_available: sinon.stub().returns(true),
    offline_sync_start_hosting: sinon.stub(),
    offline_sync_stop_hosting: sinon.stub(),
    offline_sync_hosting_session: sinon.stub().returns(''),
    offline_sync_scan_and_join: sinon.stub(),
    offline_sync_leave_session: sinon.stub(),
    ...overrides,
  });

  const withBridge = (impl) => {
    (window as any).medicmobile_android = impl;
  };

  beforeEach(() => {
    sessionEndHandler = undefined;
    authService = { has: sinon.stub().resolves(true) };
    sessionService = {
      isOnlineOnly: sinon.stub().returns(false),
      onSessionEnd: sinon.stub().callsFake(handler => sessionEndHandler = handler),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: SessionService, useValue: sessionService },
      ],
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

    it('is unsupported when the app lacks the newest of these methods', () => {
      withBridge(bridge({ offline_sync_hosting_session: undefined }));

      expect(service.isSupported()).to.be.false;
      expect(service.hostingSession()).to.be.null;
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

    it('allows joining on a device that cannot host', async () => {
      withBridge(bridge({ offline_sync_host_available: sinon.stub().returns(false) }));

      expect(await service.canHost()).to.be.false;
      expect(await service.canJoin()).to.be.true;
    });

    it('refuses joining for an online-only user, admins included', async () => {
      withBridge(bridge());
      sessionService.isOnlineOnly.returns(true);

      expect(await service.canJoin()).to.be.false;
    });

    it('does not ask for the permission when the device cannot do it anyway', async () => {
      withBridge(bridge({ offline_sync_host_available: sinon.stub().returns(false) }));

      await service.canHost();

      expect(authService.has.calledWith('can_relay_offline_data_bundle')).to.be.false;
    });

    it('refuses rather than throws when the permission check fails', async () => {
      withBridge(bridge());
      authService.has.rejects({ status: 503 });

      expect(await service.canHost()).to.be.false;
      expect(await service.canJoin()).to.be.false;
    });

    it('lets a user take part as either host or peer', async () => {
      withBridge(bridge());
      authService.has.withArgs('can_relay_offline_data_bundle').resolves(false);

      expect(await service.canTakePart()).to.be.true;

      authService.has.withArgs('can_send_offline_data_bundle').resolves(false);

      expect(await service.canTakePart()).to.be.false;
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

    it('does nothing without a bridge', () => {
      expect(() => service.startHosting()).to.not.throw();
      expect(() => service.stopHosting()).to.not.throw();
      expect(() => service.scanAndJoin()).to.not.throw();
      expect(() => service.leaveSession()).to.not.throw();
      expect(service.hostingSession()).to.be.null;
    });

    it('reads back the session being hosted', () => {
      const session = { qr: 'data:image/png;base64,abc', ssid: 'AndroidShare_1234', password: 'a-pwd' };
      withBridge(bridge({ offline_sync_hosting_session: sinon.stub().returns(JSON.stringify(session)) }));

      expect(service.hostingSession()).to.deep.equal(session);
    });

    it('reads no session when nothing is hosted', () => {
      withBridge(bridge());

      expect(service.hostingSession()).to.be.null;
    });
  });

  describe('when the session ends', () => {
    it('stops hosting and leaves a joined session', async () => {
      const android = bridge();
      withBridge(android);

      await sessionEndHandler();

      expect(android.offline_sync_stop_hosting.callCount).to.equal(1);
      expect(android.offline_sync_leave_session.callCount).to.equal(1);
    });

    it('reports a bridge call that throws as a rejection', async () => {
      withBridge(bridge({ offline_sync_stop_hosting: sinon.stub().throws(new Error('bridge threw')) }));

      const error = await sessionEndHandler().catch(err => err);

      expect(error.message).to.equal('bridge threw');
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
