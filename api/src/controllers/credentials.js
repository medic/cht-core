const _ = require('lodash/core');
const secureSettings = require('@medic/settings');

const serverUtils = require('../server-utils');
const auth = require('../auth');

const checkAuth = req => {
  return auth.getUserCtx(req)
    .then(userCtx => auth.isDbAdmin(userCtx))
    .then(isDbAdmin => {
      if (!isDbAdmin) {
        return Promise.reject({ code: 403, reason: 'Insufficient permissions' });
      }
    });
};

module.exports = {
  /**
   * @openapi
   * /api/v1/credentials/{key}:
   *   put:
   *     summary: Set a credential
   *     operationId: v1CredentialsKeyPut
   *     description: |
   *       Securely store a credential for authentication with third-party systems such as SMS aggregators and HMIS.
   *       The credential key is provided as a path parameter and the password as plain text in the request body.
   *       Only database admins can access this endpoint.
   *
   *       Example:
   *       To set a credential with key “mykey” and password “my pass” use the following command:
   *
   *       ```shell
   *       curl -X PUT -H "Content-Type: text/plain" https://<user>:<pass>@<domain>/api/v1/credentials/mykey -d 'my pass'
   *       ```
   *     tags: [Config]
   *     x-since: 4.0.0
   *     parameters:
   *       - in: path
   *         name: key
   *         required: true
   *         schema:
   *           type: string
   *         description: The credential key identifier.
   *     requestBody:
   *       required: true
   *       content:
   *         text/plain:
   *           schema:
   *             type: string
   *             description: The credential password/secret value.
   *     responses:
   *       '200':
   *         description: Credential stored successfully
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
  put: (req, res) => {
    const key = req.params.key;
    const password = req.body;

    if (!key) {
      return serverUtils.error({ code: 400, reason: 'Missing required param "key"' }, req, res);
    }
    if (_.isEmpty(password)) {
      return serverUtils.error({ code: 400, reason: 'Missing required request body' }, req, res);
    }

    return checkAuth(req) // consider removing this step after upgrading to CouchDB v3 which is more secure by default
      .then(() => secureSettings.setCredentials(key, password))
      .then(() => res.json({ ok: true }))
      .catch(err => serverUtils.error(err, req, res));
  }
};
