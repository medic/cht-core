const auth = require('../auth');
const logger = require('@medic/logger');
const serverUtils = require('../server-utils');

const UNKNOWN = 'unknown';

/**
 * POST /api/v1/p2p/telemetry
 * Receives P2P telemetry from devices. Fire-and-forget (202 Accepted).
 */
const recordTelemetry = async (req, res) => {
  try {
    // Verify user is authenticated
    await auth.getUserCtx(req);

    const { device_id, sessions } = req.body || {};

    if (!device_id) {
      return serverUtils.error({ code: 400, message: 'Missing required field: device_id' }, req, res);
    }

    if (!Array.isArray(sessions) || sessions.length === 0) {
      return serverUtils.error({ code: 400, message: 'Missing or empty required field: sessions' }, req, res);
    }

    // Log telemetry for now — a future iteration can persist to a telemetry DB
    logger.info('P2P telemetry received from device %s: %d sessions', device_id, sessions.length);

    for (const session of sessions) {
      logger.info(
        'P2P session %s: role=%s, docs=%d, bytes=%d, status=%s',
        session.session_id || UNKNOWN,
        session.role || UNKNOWN,
        session.docs_transferred || 0,
        session.bytes_transferred || 0,
        session.status || UNKNOWN
      );
    }

    // Return 202 immediately — telemetry is fire-and-forget
    res.status(202).json({ ok: true });
  } catch (err) {
    serverUtils.error(err, req, res);
  }
};

module.exports = {
  recordTelemetry,
};
