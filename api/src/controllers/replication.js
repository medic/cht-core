const replication = require('../services/replication/replication');
const serverUtils = require('../server-utils');
const auth = require('../auth');
const logger = require('@medic/logger');
const { HTTP_HEADERS } = require('@medic/constants');
const dataBundle = require('../services/offline-data-bundle/data-bundle');

const RELAY_PERMISSION = 'can_relay_offline_data_bundle';

module.exports = {
  getDocIds: async (req, res) => {
    try {
      const context = await replication.getContext(req.userCtx, res);
      const docIdsRevs = await replication.getDocIdsRevPairs(context.docIds);
      return res.json({
        doc_ids_revs: docIdsRevs,
        warn_docs: context.warnDocIds.length,
        last_seq: context.lastSeq,
        warn: context.warn,
        limit: context.limit,
      });
    } catch (err) {
      return serverUtils.serverError(err, req, res);
    }
  },
  getDocIdsToDelete: async (req, res) => {
    const docIds = req.body?.doc_ids;
    try {
      const docIdsToDelete = await replication.getDocIdsToDelete(req.userCtx, docIds);
      return res.json({ doc_ids: docIdsToDelete });
    } catch (err) {
      return serverUtils.serverError(err, req, res);
    }
  },
  /**
   * @openapi
   * /api/v1/replication/data-bundle:
   *   post:
   *     summary: Relay an offline data bundle
   *     operationId: v1ReplicationDataBundlePost
   *     description: >
   *       Ingests one offline data bundle carried by a relaying device. The bundle is a signed,
   *       encrypted delta produced by a peer device. Data from the bundle is validated through the
   *       offline write-authorization pipeline according to the user who originally produced the
   *       bundle, not the user relaying it to this endpoint. Documents the peer is not authorized to
   *       write are dropped and not reported back.
   *     tags: [Bulk]
   *     x-permissions:
   *       hasAny: [can_relay_offline_data_bundle]
   *     parameters:
   *       - in: header
   *         name: X-Medic-Bundle-Envelope
   *         required: true
   *         description: >
   *           Base64 of the JSON envelope. The envelope is cleartext so a relaying device can order
   *           bundles and detect gaps without reading the payload.
   *         schema:
   *           type: object
   *           required: [user, device_id]
   *           properties:
   *             user:
   *               type: string
   *               description: Username of the peer that produced the bundle.
   *             device_id:
   *               type: string
   *               description: Identifier of the peer device that produced the bundle.
   *       - in: header
   *         name: X-Medic-Bundle-Signature
   *         required: true
   *         description: >
   *           Base64 Ed25519 signature over the envelope header bytes, made with the peer
   *           device's registered signing key.
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       description: The encrypted bundle payload.
   *       content:
   *         application/octet-stream:
   *           schema:
   *             type: string
   *             format: binary
   *     responses:
   *       '200':
   *         description: The bundle was ingested.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/OkResponse'
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   */
  dataBundle: async (req, res) => {
    try {
      await auth.assertPermissions(req, { hasAny: [RELAY_PERMISSION] });
      await dataBundle.process(
        req.get(HTTP_HEADERS.BUNDLE_ENVELOPE),
        req.get(HTTP_HEADERS.BUNDLE_SIGNATURE),
        req
      );
      logger.info(`REQ ${req.id} - Relayed an offline data bundle.`);
      return res.json({ ok: true });
    } catch (err) {
      return serverUtils.error(err, req, res);
    }
  },
};
