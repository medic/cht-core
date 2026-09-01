const auth = require('../auth');
const serverUtils = require('../server-utils');
const logger = require('@medic/logger');
const dataBundle = require('../services/offline-data-bundle/data-bundle');

const RELAY_PERMISSION = 'can_relay_offline_data_bundle';

/**
 * @openapi
 * tags:
 *   - name: Replication
 *     description: Operations for replicating data to and from offline devices
 */
module.exports = {
  /**
   * @openapi
   * /api/v1/replication/data-bundle:
   *   post:
   *     summary: Relay offline data bundles
   *     operationId: v1ReplicationDataBundlePost
   *     description: >
   *       Ingests one or more offline data bundles carried by a relaying device (the "taxi"). Each bundle is a
   *       signed, encrypted delta produced by a peer device: the server verifies the peer's signature, decrypts the
   *       payload with its own age key, then validates every doc AS the peer through the offline write-authorization
   *       pipeline before writing it with `new_edits:false` (original revisions preserved). A per-(user, device)
   *       checkpoint is advanced through the contiguous run of ingested bundles and returned. The caller is the
   *       relaying device and requires the `can_relay_offline_data_bundle` permission.
   *     tags: [Replication]
   *     x-permissions:
   *       hasAny: [can_relay_offline_data_bundle]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [bundles]
   *             properties:
   *               bundles:
   *                 type: array
   *                 description: The bundles to ingest, in any order.
   *                 items:
   *                   type: object
   *                   required: [envelope, payload, signature]
   *                   properties:
   *                     envelope:
   *                       type: object
   *                       description: >
   *                         Cleartext, signed metadata. Identifies the peer and orders the bundle so the relay can
   *                         gap-check without reading the payload.
   *                       required: [user, device_id, bundle_seq, start_seq, end_seq]
   *                       properties:
   *                         user:
   *                           type: string
   *                           description: The peer's username.
   *                         device_id:
   *                           type: string
   *                           description: The peer's device identifier.
   *                         bundle_seq:
   *                           type: number
   *                           description: Monotonic bundle sequence number.
   *                         start_seq:
   *                           type: number
   *                           description: Inclusive lower sequence bound covered by this bundle.
   *                         end_seq:
   *                           type: number
   *                           description: Exclusive upper sequence bound covered by this bundle.
   *                     payload:
   *                       type: string
   *                       description: Base64 of the age ciphertext (NDJSON of the docs, encrypted to the server).
   *                     signature:
   *                       type: string
   *                       description: >
   *                         Base64 Ed25519 signature over the canonical envelope bytes concatenated with the raw
   *                         payload bytes.
   *     responses:
   *       '200':
   *         description: Bundles processed. Every valid bundle is ingested; invalid bundles are surfaced individually.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 results:
   *                   type: array
   *                   items:
   *                     type: object
   *                     additionalProperties: true
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   */
  request: async (req, res) => {
    if (!req.body || !Array.isArray(req.body.bundles)) {
      return serverUtils.error(
        { code: 400, reason: 'POST body must include a `bundles` array.' },
        req,
        res
      );
    }

    try {
      await auth.assertPermissions(req, { hasAny: [RELAY_PERMISSION] });
      const result = await dataBundle.process(req.body.bundles);
      logger.info(`REQ ${req.id} - Relayed ${req.body.bundles.length} offline data bundle(s).`);
      res.json(result);
    } catch (err) {
      serverUtils.error(err, req, res);
    }
  },
};
