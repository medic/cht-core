const bodyParser = require('body-parser');

const { authorize } = require('./authorize');
const { getConfig } = require('./config');
const { recordTelemetry } = require('./telemetry');
const { getRevocationList } = require('./revocation-list');
const authorization = require('../middleware/authorization');

const jsonParser = bodyParser.json({ limit: '1mb' });

/**
 * Register all P2P API routes.
 * Called from the main routing.js.
 * P2P routes must be accessible by offline users,
 * so we set the authorized flag to bypass the offline user firewall.
 *
 * @param {Object} app - Express router
 */
const registerP2pRoutes = (app) => {
  app.all('/api/v1/p2p/*path', authorization.setAuthorized);
  app.post('/api/v1/p2p/authorize', jsonParser, authorize);
  app.get('/api/v1/p2p/config/:facility_id', getConfig);
  app.post('/api/v1/p2p/telemetry', jsonParser, recordTelemetry);
  app.get('/api/v1/p2p/revocation-list', getRevocationList);
};

module.exports = registerP2pRoutes;
