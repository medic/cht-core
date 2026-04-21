import { Injectable } from '@angular/core';

import { SettingsService } from '@mm-services/settings.service';
import { SessionService } from '@mm-services/session.service';

export type P2pRole = 'host' | 'peer' | null;

export interface P2pSyncConfig {
  enabled: boolean;
  host_roles: string[];
  peer_roles: string[];
  transit_relay: {
    enabled: boolean;
    max_age_days: number;
  };
  pause_replication_during_sync: boolean;
}

const DEFAULTS: P2pSyncConfig = {
  enabled: false,
  host_roles: [],
  peer_roles: [],
  transit_relay: {
    enabled: true,
    max_age_days: 30,
  },
  pause_replication_during_sync: false,
};

@Injectable({
  providedIn: 'root'
})
export class P2pConfigService {
  private configCache: P2pSyncConfig | null = null;

  constructor(
    private readonly settingsService: SettingsService,
    private readonly sessionService: SessionService
  ) {}

  async getConfig(): Promise<P2pSyncConfig> {
    if (this.configCache) {
      return this.configCache;
    }
    try {
      const settings = await this.settingsService.get();
      const p2p = settings?.p2p_sync || {};
      this.configCache = {
        enabled: p2p.enabled === undefined ? DEFAULTS.enabled : !!p2p.enabled,
        host_roles: p2p.host_roles || DEFAULTS.host_roles,
        peer_roles: p2p.peer_roles || DEFAULTS.peer_roles,
        transit_relay: {
          enabled: p2p.transit_relay?.enabled === undefined
            ? DEFAULTS.transit_relay.enabled
            : !!p2p.transit_relay.enabled,
          max_age_days: p2p.transit_relay?.max_age_days || DEFAULTS.transit_relay.max_age_days,
        },
        pause_replication_during_sync: p2p.pause_replication_during_sync === undefined
          ? DEFAULTS.pause_replication_during_sync
          : !!p2p.pause_replication_during_sync,
      };
      return this.configCache;
    } catch (err) {
      console.error('P2pConfigService: failed to load config', err);
      return DEFAULTS;
    }
  }

  async isEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.enabled;
  }

  async getUserP2pRole(): Promise<P2pRole> {
    const config = await this.getConfig();
    const user = this.sessionService.userCtx();
    const userRoles: string[] = user?.roles || [];

    if (userRoles.some(r => config.host_roles.includes(r))) {
      return 'host';
    }
    if (userRoles.some(r => config.peer_roles.includes(r))) {
      return 'peer';
    }
    return null;
  }

  async shouldPauseReplicationDuringSync(): Promise<boolean> {
    const config = await this.getConfig();
    return config.pause_replication_during_sync;
  }

  invalidateCache() {
    this.configCache = null;
  }
}
