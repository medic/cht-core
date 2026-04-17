const environment = require('@medic/environment');
const auth = require('../auth');
const serverUtils = require('../server-utils');

const service = require('../services/setup/upgrade');
const configWatcher = require('../services/config-watcher');

const REQUIRED_PERMISSIONS = ['can_upgrade'];
const checkAuth = (req) => auth.check(req, REQUIRED_PERMISSIONS);

/**
 * @openapi
 * tags:
 *   - name: Upgrade
 *     description: Operations for upgrading the CHT instance
 * components:
 *   schemas:
 *     UpgradeRequestBody:
 *       type: object
 *       required: [build]
 *       properties:
 *         build:
 *           type: object
 *           required: [namespace, application, version]
 *           properties:
 *             namespace:
 *               type: string
 *               description: Must be "medic".
 *             application:
 *               type: string
 *               description: Must be "medic".
 *             version:
 *               type: string
 *               description: >
 *                 The version to upgrade to. Should correspond to a release, pre-release, or branch
 *                 that has been pushed to the builds server (`https://staging.dev.medicmobile.org/builds`).
 */

const upgrade = (req, res, stageOnly) => {
  return checkAuth(req)
    .then(userCtx => {
      const buildInfo = req.body.build;
      if (!buildInfo) {
        throw {
          message: 'You must provide a build info body',
          status: 400
        };
      }

      return service.upgrade(buildInfo, userCtx.user, stageOnly);
    })
    .then(() => res.json({ ok: true }))
    .catch(err => serverUtils.error(err, req, res));
};

const completeUpgrade = (req, res) => {
  return checkAuth(req)
    .then(() => service.complete(req.body.build))
    .then(() => {
      res.json({ ok: true });
    })
    .catch(err => serverUtils.error(err, req, res));
};

const upgradeInProgress = (req, res) => {
  return checkAuth(req)
    .then(() => Promise.all([
      service.upgradeInProgress(),
      service.indexerProgress(),
    ]))
    .then(([upgradeDoc, indexers]) => {
      res.json({ upgradeDoc, indexers, buildsUrl: environment.buildsUrl });
    })
    .catch(err => {
      if (err && err.error && err.error.code === 'ECONNREFUSED') {
        err.type = 'upgrade.connection.refused';
      }
      return serverUtils.error(err, req, res);
    });
};

const abortUpgrade = (req, res) => {
  return checkAuth(req)
    .then(() => service.abort())
    .then(() => res.json({ ok: true }))
    .catch(err => serverUtils.error(err, req, res));
};

const canUpgrade = async (req, res) => {
  try {
    await checkAuth(req);
    res.json({ ok: await service.canUpgrade() });
  } catch (err) {
    serverUtils.error(err, req, res);
  }
};

const compareUpgrade = async (req, res) => {
  try {
    await checkAuth(req);

    const buildInfo = req.body.build;
    if (!buildInfo) {
      const err = new Error('You must provide a build info body');
      err.status = 400;
      throw err;
    }

    const compare = await service.compareBuildVersions(buildInfo);
    res.json(compare);
  } catch (err) {
    serverUtils.error(err, req, res);
  }
};

module.exports = {
  /**
   * @openapi
   * /api/v2/upgrade/can-upgrade:
   *   get:
   *     summary: Check if an upgrade can be performed
   *     operationId: v2UpgradeCanUpgradeGet
   *     description: Returns whether the instance is in a state where an upgrade can be performed.
   *     tags: [Upgrade]
   *     x-permissions:
   *       hasAll: [can_upgrade]
   *     responses:
   *       '200':
   *         description: Whether an upgrade can be performed
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 ok:
   *                   type: boolean
   *                   description: Whether an upgrade can be performed.
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   */
  canUpgrade: canUpgrade,

  /**
   * @openapi
   * /api/v1/upgrade:
   *   post:
   *     summary: Upgrade to a version
   *     operationId: v1UpgradePost
   *     deprecated: true
   *     description: >
   *       Use [POST /api/v2/upgrade](#/Upgrade/v2UpgradePost) instead.
   *       Performs a complete upgrade to the provided version. This is equivalent to calling
   *       `/api/v1/upgrade/stage` and then `/api/v1/upgrade/complete` once staging has finished.
   *       This is asynchronous. Progress can be followed by watching the `horti-upgrade` document.
   *       Calling this endpoint will eventually cause api and sentinel to restart.
   *     tags: [Upgrade]
   *     x-permissions:
   *       hasAll: [can_upgrade]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpgradeRequestBody'
   *     responses:
   *       '200':
   *         description: Upgrade initiated
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
   * /api/v2/upgrade:
   *   post:
   *     summary: Upgrade to a version
   *     operationId: v2UpgradePost
   *     description: |
   *       Performs a complete upgrade to the provided version. This is equivalent to calling
   *       `/api/v2/upgrade/stage` and then `/api/v2/upgrade/complete` once staging has finished.
   *       This is asynchronous. Progress can be followed via [GET /api/v2/upgrade](#/Upgrade/v2UpgradeGet).
   *
   *       Calling this endpoint will eventually cause api and sentinel to restart.
   *
   *       It is expected that the caller ensures forwards or backwards compatibility is maintained between deployed
   *       versions. This endpoint does not stop you from “upgrading” to an earlier version, or a branch that is
   *       incompatible with your current state.
   *     tags: [Upgrade]
   *     x-permissions:
   *       hasAll: [can_upgrade]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpgradeRequestBody'
   *     responses:
   *       '200':
   *         description: Upgrade initiated
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
  upgrade: (req, res) => upgrade(req, res, false),

  /**
   * @openapi
   * /api/v1/upgrade/stage:
   *   post:
   *     summary: Stage an upgrade
   *     operationId: v1UpgradeStagePost
   *     deprecated: true
   *     description: >
   *       Use [POST /api/v2/upgrade/stage](#/Upgrade/v2UpgradeStagePost) instead.
   *       Stages an upgrade to the provided version. Does as much of the upgrade as possible without actually
   *       swapping versions over and restarting. An upgrade has been staged when the `horti-upgrade` document
   *       has `"action": "stage"` and `"staging_complete": true`.
   *     tags: [Upgrade]
   *     x-permissions:
   *       hasAll: [can_upgrade]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpgradeRequestBody'
   *     responses:
   *       '200':
   *         description: Staging initiated
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
   * /api/v2/upgrade/stage:
   *   post:
   *     summary: Stage an upgrade
   *     operationId: v2UpgradeStagePost
   *     description: >
   *       Stages an upgrade to the provided version. Does as much of the upgrade as possible without actually
   *       swapping versions over and restarting.
   *     tags: [Upgrade]
   *     x-permissions:
   *       hasAll: [can_upgrade]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpgradeRequestBody'
   *     responses:
   *       '200':
   *         description: Staging initiated
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
  stage: (req, res) => upgrade(req, res, true),

  /**
   * @openapi
   * /api/v1/upgrade/complete:
   *   post:
   *     summary: Complete a staged upgrade
   *     operationId: v1UpgradeCompletePost
   *     deprecated: true
   *     description: >
   *       Use [POST /api/v2/upgrade/complete](#/Upgrade/v2UpgradeCompletePost) instead.
   *       Completes a staged upgrade. Returns a 404 if there is no upgrade in the staged position.
   *     tags: [Upgrade]
   *     x-permissions:
   *       hasAll: [can_upgrade]
   *     responses:
   *       '200':
   *         description: Upgrade completed
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/OkResponse'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   *       '404':
   *         $ref: '#/components/responses/NotFound'
   * /api/v2/upgrade/complete:
   *   post:
   *     summary: Complete a staged upgrade
   *     operationId: v2UpgradeCompletePost
   *     description: >
   *       Completes a staged upgrade. Returns a 404 if there is no upgrade in the staged position.
   *     tags: [Upgrade]
   *     x-permissions:
   *       hasAll: [can_upgrade]
   *     responses:
   *       '200':
   *         description: Upgrade completed
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/OkResponse'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   *       '404':
   *         $ref: '#/components/responses/NotFound'
   */
  complete: completeUpgrade,

  /**
   * @openapi
   * /api/v2/upgrade:
   *   get:
   *     summary: Get upgrade status
   *     operationId: v2UpgradeGet
   *     description: Returns the current upgrade status, indexer progress, and builds server URL.
   *     tags: [Upgrade]
   *     x-permissions:
   *       hasAll: [can_upgrade]
   *     responses:
   *       '200':
   *         description: The current upgrade status
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 upgradeDoc:
   *                   description: The current upgrade document, or null if no upgrade is in progress.
   *                 indexers:
   *                   description: Current indexer progress information.
   *                 buildsUrl:
   *                   type: string
   *                   description: The URL of the builds server.
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   */
  upgradeInProgress: upgradeInProgress,

  /**
   * @openapi
   * /api/v2/upgrade:
   *   delete:
   *     summary: Abort an upgrade
   *     operationId: v2UpgradeDelete
   *     description: Aborts an in-progress upgrade.
   *     tags: [Upgrade]
   *     x-permissions:
   *       hasAll: [can_upgrade]
   *     responses:
   *       '200':
   *         description: Upgrade aborted
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/OkResponse'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   */
  abort: abortUpgrade,

  /**
   * @openapi
   * /api/v2/upgrade/service-worker:
   *   post:
   *     summary: Update the service worker
   *     operationId: v2UpgradeServiceWorkerPost
   *     description: Triggers an update of the service worker cache.
   *     tags: [Upgrade]
   *     x-permissions:
   *       hasAll: [can_upgrade]
   *     responses:
   *       '200':
   *         description: Service worker updated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/OkResponse'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   */
  serviceWorker: (req, res) => {
    return checkAuth(req)
      .then(() => configWatcher.updateServiceWorker())
      .then(() => res.json({ ok: true }))
      .catch(err => serverUtils.error(err, req, res));
  },

  /**
   * @openapi
   * /api/v2/upgrade/compare:
   *   post:
   *     summary: Compare build versions
   *     operationId: v2UpgradeComparePost
   *     description: >
   *       Compares the provided build version against the currently deployed version, returning
   *       differences in design documents.
   *     tags: [Upgrade]
   *     x-permissions:
   *       hasAll: [can_upgrade]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpgradeRequestBody'
   *     responses:
   *       '200':
   *         description: Comparison results
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 additionalProperties: true
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   */
  compare: compareUpgrade,
};
