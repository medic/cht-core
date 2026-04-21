const auth = require('../auth');
const config = require('../config');
const serverUtils = require('../server-utils');

const DEFAULTS = {
  enabled: false,
  host_roles: [],
  peer_roles: [],
  transit_relay: {
    enabled: true,
    max_age_days: 30,
  },
  max_doc_size_kb: 256,
  token_expiry_days: 30,
  wifi_hotspot_idle_timeout_sec: 300,
  pause_replication_during_sync: false,
};

const getP2pConfig = () => {
  const p2pSettings = config.get('p2p_sync') || {};
  return {
    enabled: p2pSettings.enabled === undefined ? DEFAULTS.enabled : !!p2pSettings.enabled,
    host_roles: p2pSettings.host_roles || DEFAULTS.host_roles,
    peer_roles: p2pSettings.peer_roles || DEFAULTS.peer_roles,
    transit_relay: {
      enabled: p2pSettings.transit_relay?.enabled === undefined
        ? DEFAULTS.transit_relay.enabled
        : !!p2pSettings.transit_relay.enabled,
      max_age_days: p2pSettings.transit_relay?.max_age_days || DEFAULTS.transit_relay.max_age_days,
    },
    max_doc_size_kb: p2pSettings.max_doc_size_kb || DEFAULTS.max_doc_size_kb,
    token_expiry_days: p2pSettings.token_expiry_days || DEFAULTS.token_expiry_days,
    wifi_hotspot_idle_timeout_sec: p2pSettings.wifi_hotspot_idle_timeout_sec || DEFAULTS.wifi_hotspot_idle_timeout_sec,
    pause_replication_during_sync: p2pSettings.pause_replication_during_sync === undefined
      ? DEFAULTS.pause_replication_during_sync
      : !!p2pSettings.pause_replication_during_sync,
  };
};

/**
 * GET /api/v1/p2p/config/:facility_id
 * Returns P2P configuration for a facility.
 */
const getConfig = async (req, res) => {
  try {
    await auth.getUserCtx(req);
    res.json(getP2pConfig());
  } catch (err) {
    serverUtils.error(err, req, res);
  }
};

module.exports = {
  getConfig,
  getP2pConfig,
  DEFAULTS,
};
