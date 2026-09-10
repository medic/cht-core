const replication = require('../services/replication/replication');
const serverUtils = require('../server-utils');
const auth = require('../auth');
const logger = require('@medic/logger');
const dataBundle = require('../services/offline-data-bundle/data-bundle');

const RELAY_PERMISSION = 'can_relay_offline_data_bundle';
const ENVELOPE_HEADER = 'X-Medic-Bundle-Envelope';
const SIGNATURE_HEADER = 'X-Medic-Bundle-Signature';

const parseEnvelope = (req) => {
  const raw = req.get(ENVELOPE_HEADER);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  } catch {
    return null;
  }
};

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
   *       bundle, not the user relaying it to this endpoint. A per-(user, device) checkpoint
   *       recording the latest synchronization point between the device and the server is returned.
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
   *           required: [user, device_id, bundle_seq, start_seq, end_seq, payload_sha256, payload_bytes]
   *           properties:
   *             user:
   *               type: string
   *               description: Username of the peer that produced the bundle.
   *             device_id:
   *               type: string
   *               description: Identifier of the peer device that produced the bundle.
   *             bundle_seq:
   *               type: number
   *               description: Monotonic bundle sequence number.
   *             start_seq:
   *               type: number
   *               description: Inclusive lower sequence bound covered by this bundle.
   *             end_seq:
   *               type: number
   *               description: Exclusive upper sequence bound covered by this bundle.
   *             payload_sha256:
   *               type: string
   *               description: Base64 SHA-256 of the request body, which binds the body to this envelope.
   *             payload_bytes:
   *               type: number
   *               description: Length of the request body in bytes.
   *       - in: header
   *         name: X-Medic-Bundle-Signature
   *         required: true
   *         description: >
   *           Base64 Ed25519 signature over the canonical envelope bytes, made with the peer
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
   *               type: object
   *               required: [user, device_id, bundle_seq, start_seq, end_seq, accepted, rejected, checkpoint]
   *               properties:
   *                 user:
   *                   type: string
   *                   description: Username of the peer that produced the bundle.
   *                 device_id:
   *                   type: string
   *                   description: Identifier of the peer device that produced the bundle.
   *                 bundle_seq:
   *                   type: number
   *                   description: The `bundle_seq` from the envelope.
   *                 start_seq:
   *                   type: number
   *                   description: The `start_seq` from the envelope.
   *                 end_seq:
   *                   type: number
   *                   description: The `end_seq` from the envelope.
   *                 accepted:
   *                   type: number
   *                   description: Number of documents written.
   *                 rejected:
   *                   type: number
   *                   description: >
   *                     Number of documents the peer was not authorized to write, or that CouchDB
   *                     refused. They are dropped, not retried.
   *                 checkpoint:
   *                   type: string
   *                   description: >
   *                     Base64 token holding the peer's synchronization point, signed by the server
   *                     and encrypted to the peer device. Only the peer can read it. It advances
   *                     only when this bundle continues from the stored checkpoint without a gap,
   *                     so a bundle that arrives out of order returns the earlier position.
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
      const envelope = parseEnvelope(req);
      const signature = req.get(SIGNATURE_HEADER);
      const result = await dataBundle.process(envelope, signature, req);
      logger.info(`REQ ${req.id} - Relayed an offline data bundle for ${result.user}.`);
      return res.json(result);
    } catch (err) {
      return serverUtils.error(err, req, res);
    }
  },
};
