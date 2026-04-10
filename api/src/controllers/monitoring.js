const service = require('../services/monitoring');
const serverUtils = require('../server-utils');

const DEFAULT_CONNECTED_USER_INTERVAL = 7;

/**
 * @openapi
 * tags:
 *   - name: Monitoring
 *     description: Operations for monitoring the CHT instance
 * components:
 *   schemas:
 *     MonitoringVersion:
 *       type: object
 *       properties:
 *         app:
 *           type: string
 *           description: The version of the webapp.
 *         node:
 *           type: string
 *           description: The version of NodeJS.
 *         couchdb:
 *           type: string
 *           description: The version of CouchDB.
 *     MonitoringCouchDb:
 *       type: object
 *       description: >
 *         CouchDB metrics keyed by database name (e.g. "medic", "medic-sentinel",
 *         "medic-users-meta", "_users").
 *       additionalProperties:
 *         type: object
 *         properties:
 *           name:
 *             type: string
 *             description: The name of the db.
 *           update_sequence:
 *             type: number
 *             description: The number of changes in the db.
 *           doc_count:
 *             type: number
 *             description: The number of docs in the db.
 *           doc_del_count:
 *             type: number
 *             description: The number of deleted docs in the db.
 *           fragmentation:
 *             type: number
 *             description: >
 *               The fragmentation of the entire db (including view indexes) as stored on disk.
 *               A lower value is better. `1` is no fragmentation.
 *           sizes:
 *             type: object
 *             description: Database size information. Requires CHT Core `4.11.0` or later.
 *             properties:
 *               active:
 *                 type: number
 *                 description: >
 *                   The size in bytes of live data inside the database. Includes documents,
 *                   metadata, and attachments, but not view indexes.
 *               file:
 *                 type: number
 *                 description: >
 *                   The size in bytes of the database file on disk. Includes documents,
 *                   metadata, and attachments, but not view indexes.
 *           view_indexes:
 *             type: array
 *             description: View index information. Requires CHT Core `4.11.0` or later.
 *             items:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   description: The name of the view index (the design).
 *                 sizes:
 *                   type: object
 *                   properties:
 *                     active:
 *                       type: number
 *                       description: The size in bytes of live data inside the view.
 *                     file:
 *                       type: number
 *                       description: The size in bytes of the view as stored on disk.
 *     MonitoringDate:
 *       type: object
 *       properties:
 *         current:
 *           type: number
 *           description: >
 *             The current server date in millis since the epoch, useful for ensuring the
 *             server time is correct.
 *         uptime:
 *           type: number
 *           description: How long API has been running in seconds.
 *     MonitoringSentinel:
 *       type: object
 *       properties:
 *         backlog:
 *           type: number
 *           description: Number of changes yet to be processed by Sentinel.
 *     MonitoringOutboundPush:
 *       type: object
 *       properties:
 *         backlog:
 *           type: number
 *           description: Number of changes yet to be processed by Outbound Push.
 *     MonitoringFeedback:
 *       type: object
 *       properties:
 *         count:
 *           type: number
 *           description: >
 *             Number of feedback docs created, usually indicative of client side errors.
 *     MonitoringConflict:
 *       type: object
 *       properties:
 *         count:
 *           type: number
 *           description: Number of doc conflicts which need to be resolved manually.
 *     MonitoringReplicationLimit:
 *       type: object
 *       properties:
 *         count:
 *           type: number
 *           description: Number of users that exceeded the replication limit of documents.
 *     MonitoringConnectedUsers:
 *       type: object
 *       properties:
 *         count:
 *           type: number
 *           description: >
 *             Number of users that have connected to the api in a given number of days.
 *             The period defaults to 7 days but can be changed via the
 *             `connected_user_interval` query parameter.
 */
module.exports = {
  /**
   * @openapi
   * /api/v1/monitoring:
   *   get:
   *     summary: Get monitoring metrics
   *     operationId: v1MonitoringGet
   *     deprecated: true
   *     description: |
   *       Use [GET /api/v2/monitoring](#/Monitoring/v2MonitoringGet) instead.
   *       Returns a range of metrics about the instance for automated monitoring, allowing tracking of trends over
   *       time and alerting about potential issues. No authentication is required.
   *
   *       Errors:
   *
   *       - A metric of `""` (for string values) or `-1` (for numeric values) indicates an error occurred while
   *         querying the metric - check the API logs for details.
   *       - If no response or an error response is received the instance is unreachable. Thus, this API can be used
   *         as an uptime monitoring endpoint.
   *     tags: [Monitoring]
   *     parameters:
   *       - in: query
   *         name: connected_user_interval
   *         schema:
   *           type: number
   *           default: 7
   *         description: The number of days to use when counting connected users
   *     responses:
   *       '200':
   *         description: Monitoring metrics
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 version:
   *                   $ref: '#/components/schemas/MonitoringVersion'
   *                 couchdb:
   *                   $ref: '#/components/schemas/MonitoringCouchDb'
   *                 date:
   *                   $ref: '#/components/schemas/MonitoringDate'
   *                 sentinel:
   *                   $ref: '#/components/schemas/MonitoringSentinel'
   *                 messaging:
   *                   type: object
   *                   properties:
   *                     outgoing:
   *                       type: object
   *                       properties:
   *                         state:
   *                           type: object
   *                           properties:
   *                             due:
   *                               type: number
   *                               description: The number of messages due to be sent.
   *                             scheduled:
   *                               type: number
   *                               description: The number of messages scheduled to be sent in the future.
   *                             muted:
   *                               type: number
   *                               description: >
   *                                 The number of messages that are muted and therefore will not be sent.
   *                             delivered:
   *                               type: number
   *                               description: >
   *                                 The number of messages that have been delivered or sent. As of 3.12.x.
   *                             failed:
   *                               type: number
   *                               description: The number of messages that have failed to be delivered. As of 3.12.x.
   *                 outbound_push:
   *                   $ref: '#/components/schemas/MonitoringOutboundPush'
   *                 feedback:
   *                   $ref: '#/components/schemas/MonitoringFeedback'
   *                 conflict:
   *                   $ref: '#/components/schemas/MonitoringConflict'
   *                 replication_limit:
   *                   $ref: '#/components/schemas/MonitoringReplicationLimit'
   *                 connected_users:
   *                   $ref: '#/components/schemas/MonitoringConnectedUsers'
   */
  getV1: (req, res) => {
    const connectedUserInterval = req.query.connected_user_interval || DEFAULT_CONNECTED_USER_INTERVAL;

    return service.jsonV1(connectedUserInterval)
      .then(body => res.json(body))
      .catch(err => serverUtils.error(err, req, res));
  },

  /**
   * @openapi
   * /api/v2/monitoring:
   *   get:
   *     summary: Get monitoring metrics
   *     operationId: v2MonitoringGet
   *     description: |
   *       Returns a range of metrics about the instance for automated monitoring, allowing tracking of trends over
   *       time and alerting about potential issues. No authentication is required.
   *
   *       Errors:
   *
   *       - A metric of `""` (for string values) or `-1` (for numeric values) indicates an error occurred while
   *         querying the metric - check the API logs for details.
   *       - If no response or an error response is received the instance is unreachable. Thus, this API can be used
   *         as an uptime monitoring endpoint.
   *     tags: [Monitoring]
   *     x-since: 3.12.0
   *     parameters:
   *       - in: query
   *         name: connected_user_interval
   *         schema:
   *           type: number
   *           default: 7
   *         description: The number of days to use when counting connected users
   *     responses:
   *       '200':
   *         description: Monitoring metrics
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 version:
   *                   $ref: '#/components/schemas/MonitoringVersion'
   *                 couchdb:
   *                   $ref: '#/components/schemas/MonitoringCouchDb'
   *                 date:
   *                   $ref: '#/components/schemas/MonitoringDate'
   *                 sentinel:
   *                   $ref: '#/components/schemas/MonitoringSentinel'
   *                 messaging:
   *                   type: object
   *                   properties:
   *                     outgoing:
   *                       type: object
   *                       properties:
   *                         total:
   *                           type: object
   *                           properties:
   *                             due:
   *                               type: number
   *                               description: The number of messages due to be sent.
   *                             scheduled:
   *                               type: number
   *                               description: The number of messages scheduled to be sent in the future.
   *                             muted:
   *                               type: number
   *                               description: >
   *                                 The number of messages that are muted and therefore will not be sent.
   *                             delivered:
   *                               type: number
   *                               description: The number of messages that have been delivered or sent.
   *                             failed:
   *                               type: number
   *                               description: The number of messages that have failed to be delivered.
   *                         seven_days:
   *                           type: object
   *                           properties:
   *                             due:
   *                               type: number
   *                               description: The number of messages due to be sent in the last seven days.
   *                             scheduled:
   *                               type: number
   *                               description: >
   *                                 The number of messages that were scheduled to be sent in the last seven days.
   *                             muted:
   *                               type: number
   *                               description: >
   *                                 The number of messages that were due in the last seven days and are muted.
   *                             delivered:
   *                               type: number
   *                               description: >
   *                                 The number of messages that were due in the last seven days and have been
   *                                 delivered or sent.
   *                             failed:
   *                               type: number
   *                               description: >
   *                                 The number of messages that were due in the last seven days and have failed
   *                                 to be delivered.
   *                         last_hundred:
   *                           type: object
   *                           properties:
   *                             pending:
   *                               type: object
   *                               description: >
   *                                 Counts within last 100 messages that have received status updates, and are
   *                                 one of the "pending" group statuses.
   *                               properties:
   *                                 pending:
   *                                   type: number
   *                                   description: Number of messages that are pending.
   *                                 forwarded-to-gateway:
   *                                   type: number
   *                                   description: Number of messages that are forwarded-to-gateway.
   *                                 received-by-gateway:
   *                                   type: number
   *                                   description: Number of messages that are received-by-gateway.
   *                                 forwarded-by-gateway:
   *                                   type: number
   *                                   description: Number of messages that are forwarded-by-gateway.
   *                             final:
   *                               type: object
   *                               description: >
   *                                 Counts within last 100 messages that have received status updates, and are
   *                                 in one of the "final" group statuses.
   *                               properties:
   *                                 sent:
   *                                   type: number
   *                                   description: Number of messages that are sent.
   *                                 delivered:
   *                                   type: number
   *                                   description: Number of messages that are delivered.
   *                                 failed:
   *                                   type: number
   *                                   description: Number of messages that are failed.
   *                                 denied:
   *                                   type: number
   *                                   description: Number of messages that are denied.
   *                                 cleared:
   *                                   type: number
   *                                   description: Number of messages that are cleared.
   *                                 muted:
   *                                   type: number
   *                                   description: Number of messages that are muted.
   *                                 duplicate:
   *                                   type: number
   *                                   description: Number of messages that are duplicate.
   *                             muted:
   *                               type: object
   *                               description: >
   *                                 Counts within last 100 messages that have received status updates, and are
   *                                 in one of the "muted" group statuses.
   *                               additionalProperties:
   *                                 type: number
   *                 outbound_push:
   *                   $ref: '#/components/schemas/MonitoringOutboundPush'
   *                 feedback:
   *                   $ref: '#/components/schemas/MonitoringFeedback'
   *                 conflict:
   *                   $ref: '#/components/schemas/MonitoringConflict'
   *                 replication_limit:
   *                   $ref: '#/components/schemas/MonitoringReplicationLimit'
   *                 connected_users:
   *                   $ref: '#/components/schemas/MonitoringConnectedUsers'
   */
  getV2: (req, res) => {
    const connectedUserInterval = req.query.connected_user_interval || DEFAULT_CONNECTED_USER_INTERVAL;

    return service
      .jsonV2(connectedUserInterval)
      .then(body => res.json(body))
      .catch(err => serverUtils.error(err, req, res));
  },
};
