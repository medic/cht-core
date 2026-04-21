import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { P2pConfigService } from '@mm-services/p2p-config.service';
import { SettingsService } from '@mm-services/settings.service';
import { SessionService } from '@mm-services/session.service';

describe('P2pConfigService', () => {
  let service: P2pConfigService;
  let settingsService;
  let sessionService;

  beforeEach(() => {
    settingsService = { get: sinon.stub().resolves({}) };
    sessionService = { userCtx: sinon.stub().returns({ roles: [] }) };

    TestBed.configureTestingModule({
      providers: [
        { provide: SettingsService, useValue: settingsService },
        { provide: SessionService, useValue: sessionService },
      ],
    });

    service = TestBed.inject(P2pConfigService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getConfig()', () => {
    it('should return defaults when p2p_sync is not configured', async () => {
      settingsService.get.resolves({});

      const config = await service.getConfig();

      expect(config.enabled).to.equal(false);
      expect(config.host_roles).to.deep.equal([]);
      expect(config.peer_roles).to.deep.equal([]);
      expect(config.transit_relay.enabled).to.equal(true);
      expect(config.transit_relay.max_age_days).to.equal(30);
      expect(config.pause_replication_during_sync).to.equal(false);
    });

    it('should return config when p2p_sync is set', async () => {
      settingsService.get.resolves({
        p2p_sync: {
          enabled: true,
          host_roles: ['supervisor'],
          peer_roles: ['chw'],
          transit_relay: { enabled: false, max_age_days: 7 },
          pause_replication_during_sync: true,
        },
      });

      const config = await service.getConfig();

      expect(config.enabled).to.equal(true);
      expect(config.host_roles).to.deep.equal(['supervisor']);
      expect(config.peer_roles).to.deep.equal(['chw']);
      expect(config.transit_relay.enabled).to.equal(false);
      expect(config.transit_relay.max_age_days).to.equal(7);
      expect(config.pause_replication_during_sync).to.equal(true);
    });

    it('should return defaults when settings service throws', async () => {
      settingsService.get.rejects(new Error('settings unavailable'));

      const config = await service.getConfig();

      expect(config.enabled).to.equal(false);
      expect(config.host_roles).to.deep.equal([]);
    });

    it('should cache config after first call', async () => {
      settingsService.get.resolves({
        p2p_sync: { enabled: true, host_roles: ['supervisor'] },
      });

      const first = await service.getConfig();
      const second = await service.getConfig();

      expect(first).to.equal(second);
      expect(settingsService.get.callCount).to.equal(1);
    });

    it('should reload config after invalidateCache()', async () => {
      settingsService.get.resolves({
        p2p_sync: { enabled: true },
      });

      await service.getConfig();
      service.invalidateCache();

      settingsService.get.resolves({
        p2p_sync: { enabled: false },
      });

      const config = await service.getConfig();

      expect(config.enabled).to.equal(false);
      expect(settingsService.get.callCount).to.equal(2);
    });
  });

  describe('isEnabled()', () => {
    it('should return false by default', async () => {
      settingsService.get.resolves({});

      const result = await service.isEnabled();

      expect(result).to.equal(false);
    });

    it('should return true when p2p_sync is enabled', async () => {
      settingsService.get.resolves({ p2p_sync: { enabled: true } });

      const result = await service.isEnabled();

      expect(result).to.equal(true);
    });
  });

  describe('getUserP2pRole()', () => {
    it('should return null when no matching role', async () => {
      settingsService.get.resolves({
        p2p_sync: { host_roles: ['supervisor'], peer_roles: ['chw'] },
      });
      sessionService.userCtx.returns({ roles: ['admin'] });

      const role = await service.getUserP2pRole();

      expect(role).to.equal(null);
    });

    it('should return host when user has host role', async () => {
      settingsService.get.resolves({
        p2p_sync: { host_roles: ['supervisor'], peer_roles: ['chw'] },
      });
      sessionService.userCtx.returns({ roles: ['supervisor'] });

      const role = await service.getUserP2pRole();

      expect(role).to.equal('host');
    });

    it('should return peer when user has peer role', async () => {
      settingsService.get.resolves({
        p2p_sync: { host_roles: ['supervisor'], peer_roles: ['chw'] },
      });
      sessionService.userCtx.returns({ roles: ['chw'] });

      const role = await service.getUserP2pRole();

      expect(role).to.equal('peer');
    });

    it('should return null when user has no roles', async () => {
      settingsService.get.resolves({
        p2p_sync: { host_roles: ['supervisor'], peer_roles: ['chw'] },
      });
      sessionService.userCtx.returns({});

      const role = await service.getUserP2pRole();

      expect(role).to.equal(null);
    });

    it('should prefer host over peer when user has both roles', async () => {
      settingsService.get.resolves({
        p2p_sync: {
          host_roles: ['supervisor'],
          peer_roles: ['chw'],
        },
      });
      sessionService.userCtx.returns({ roles: ['chw', 'supervisor'] });

      const role = await service.getUserP2pRole();

      expect(role).to.equal('host');
    });
  });

  describe('shouldPauseReplicationDuringSync()', () => {
    it('should return false by default', async () => {
      settingsService.get.resolves({});

      const result = await service.shouldPauseReplicationDuringSync();

      expect(result).to.equal(false);
    });

    it('should return true when configured', async () => {
      settingsService.get.resolves({
        p2p_sync: { pause_replication_during_sync: true },
      });

      const result = await service.shouldPauseReplicationDuringSync();

      expect(result).to.equal(true);
    });
  });
});
