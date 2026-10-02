/**
 * The FHIR facade's HTTP surface: a read-only FHIR R4 server over CHT
 * documents, driven by the deployment's mapping in `settings.fhir`.
 *
 * `/api/v1/fhir` is the FHIR service base, so a client resolves `metadata`
 * and every resource path relative to it.
 *
 * This module deliberately does not use `serverUtils.error` for its client
 * error bodies. That helper negotiates on `req.accepts(['text','json'])`,
 * which an `Accept: application/fhir+json` request matches neither of, so it
 * would answer `text/plain` — and its `{code,error,details}` body is not an
 * OperationOutcome.
 */
const { InvalidArgumentError, ResourceNotFoundError } = require('@medic/cht-datasource');
const {
  FHIR_JSON_CONTENT_TYPE,
  RESOURCE_TYPES,
  bindingServesType,
  buildCapabilityStatement,
  operationOutcome,
  searchsetBundle,
} = require('@medic/cht-fhir');
const auth = require('../auth');
const fhir = require('../services/fhir');
const serverUtils = require('../server-utils');

const PERMISSION = 'can_access_fhir_api';

/** Result parameters, which are not resource search parameters. */
const RESULT_PARAMS = new Set(['_count', '_cursor', '_format', '_pretty']);

/* -------------------------------- responses ------------------------------- */

/**
 * nginx terminates TLS and proxies to api over plain http, so `req.protocol`
 * is `http` for every real request. nginx says so in `X-Forwarded-Proto`, and
 * passes `Host` through unchanged, so only the scheme needs correcting.
 */
const scheme = (req) => req.get('x-forwarded-proto')?.split(',')[0].trim() || req.protocol;

const serviceBase = (req) => `${scheme(req)}://${req.get('host')}/api/v1/fhir`;

// Lazy, so the match is the service base at the head of the path rather than
// a later occurrence of the same string in a query parameter.
const selfUrl = (req) => `${serviceBase(req)}${req.originalUrl.replace(/^.*?\/api\/v1\/fhir/, '')}`;

const nextUrl = (req, cursor) => {
  const url = new URL(selfUrl(req));
  url.searchParams.set('_cursor', cursor);
  return url.toString();
};

const sendResource = (res, resource, status = 200) => res
  .status(status)
  .type(FHIR_JSON_CONTENT_TYPE)
  .json(resource);

const ISSUE_CODES = {
  400: 'invalid',
  401: 'login',
  403: 'forbidden',
  404: 'not-found',
  503: 'transient',
};

const sendOutcome = (res, status, diagnostics) => sendResource(
  res,
  operationOutcome(ISSUE_CODES[status] ?? 'exception', diagnostics),
  status,
);

const statusFor = (err) => {
  if (err instanceof InvalidArgumentError) {
    return 400;
  }
  if (err instanceof ResourceNotFoundError) {
    return 404;
  }
  const code = err?.code || err?.statusCode || err?.status;
  return Number.isInteger(code) ? code : 500;
};

/**
 * The FHIR equivalent of `serverUtils.doOrError`. A 500 keeps its detail out
 * of the response but logs it, matching how `serverUtils.serverError` behaves.
 */
const doOrOutcome = (handler) => async (req, res) => {
  try {
    return await handler(req, res);
  } catch (err) {
    const status = statusFor(err);
    if (status >= 500) {
      serverUtils.error(err, req, res, false);
      return;
    }
    return sendOutcome(res, status, err?.message || err?.reason || 'Request failed');
  }
};

/* --------------------------------- gating --------------------------------- */

/**
 * Resolve the facade, or send the response that should go instead.
 *
 * No mapping at all is a 404: this deployment is not a FHIR server. A mapping
 * that will not load is a 503, because the operator has configured something
 * and the API logs say what is wrong with it.
 */
const requireFacade = (res) => {
  if (!fhir.isConfigured()) {
    sendOutcome(res, 404, 'This server has no FHIR mapping configured, so the FHIR facade is not enabled.');
    return null;
  }
  const { config } = fhir.getFacade();
  if (!config) {
    sendOutcome(res, 503, 'The FHIR mapping for this server is not usable. See the API logs for why.');
    return null;
  }
  return config;
};

/** The facade, or null once a response has been sent because the type is not served. */
const requireResourceType = (res, resourceType) => {
  const config = requireFacade(res);
  if (!config) {
    return null;
  }
  if (!RESOURCE_TYPES[resourceType] || !config.bindings.some(binding => bindingServesType(binding, resourceType))) {
    sendOutcome(res, 404, `${resourceType} is not configured on this server.`);
    return null;
  }
  return config;
};

const assertPermission = (req) => auth.assertPermissions(req, { isOnline: true, hasAll: [PERMISSION] });

/* -------------------------------- handlers -------------------------------- */

/**
 * @openapi
 * tags:
 *   - name: FHIR
 *     description: A read-only FHIR R4 facade over CHT documents
 */
module.exports = {
  v1: {
    /**
     * @openapi
     * /api/v1/fhir/metadata:
     *   get:
     *     description: Returns the CapabilityStatement for the FHIR facade.
     *     summary: Get the FHIR CapabilityStatement
     *     operationId: v1FhirMetadataGet
     *     tags: [FHIR]
     *     x-permissions: { hasAll: [can_access_fhir_api] }
     *     x-since: 5.4.0
     *     responses:
     *       200:
     *         description: A FHIR CapabilityStatement resource.
     *         content:
     *           application/fhir+json:
     *             schema:
     *               type: object
     *       401:
     *         $ref: '#/components/responses/Unauthorized'
     *       403:
     *         $ref: '#/components/responses/Forbidden'
     *       404:
     *         description: The FHIR facade is not configured on this server.
     *         content:
     *           application/fhir+json:
     *             schema:
     *               type: object
     */
    metadata: doOrOutcome(async (req, res) => {
      await assertPermission(req);
      const config = requireFacade(res);
      if (!config) {
        return;
      }
      return sendResource(res, buildCapabilityStatement({
        config,
        serviceBase: serviceBase(req),
        now: new Date().toISOString(),
        softwareVersion: process.env.npm_package_version,
      }));
    }),

    /**
     * @openapi
     * /api/v1/fhir/{resourceType}:
     *   get:
     *     description: >-
     *       Searches a configured FHIR resource type and returns a searchset Bundle. Pagination is
     *       cursor-based: follow `Bundle.link[relation=next]` verbatim.
     *     summary: Search a FHIR resource type
     *     operationId: v1FhirResourceTypeGet
     *     tags: [FHIR]
     *     x-permissions: { hasAll: [can_access_fhir_api] }
     *     x-since: 5.4.0
     *     parameters:
     *       - in: path
     *         name: resourceType
     *         required: true
     *         schema:
     *           type: string
     *         description: A configured FHIR resource type, such as Patient.
     *       - in: query
     *         name: _count
     *         required: false
     *         schema:
     *           type: integer
     *         description: Page size.
     *       - in: query
     *         name: _cursor
     *         required: false
     *         schema:
     *           type: string
     *         description: An opaque cursor from a previous page's next link.
     *     responses:
     *       200:
     *         description: A FHIR searchset Bundle.
     *         content:
     *           application/fhir+json:
     *             schema:
     *               type: object
     *       400:
     *         description: An unsupported or invalid search parameter.
     *         content:
     *           application/fhir+json:
     *             schema:
     *               type: object
     *       401:
     *         $ref: '#/components/responses/Unauthorized'
     *       403:
     *         $ref: '#/components/responses/Forbidden'
     *       404:
     *         description: The resource type is not configured on this server.
     *         content:
     *           application/fhir+json:
     *             schema:
     *               type: object
     */
    search: doOrOutcome(async (req, res) => {
      await assertPermission(req);
      const { resourceType } = req.params;
      const config = requireResourceType(res, resourceType);
      if (!config) {
        return;
      }

      const supported = RESOURCE_TYPES[resourceType].searchParams.map(spec => spec.name);
      const params = {};
      for (const [name, value] of Object.entries(req.query)) {
        if (RESULT_PARAMS.has(name)) {
          continue;
        }
        if (!supported.includes(name)) {
          return sendOutcome(
            res,
            400,
            `${resourceType} does not support the search parameter ${name}. Supported: ${supported.join(', ')}.`,
          );
        }
        // A repeated parameter arrives as an array; FHIR treats that as AND,
        // which no plan implements, so take the last rather than guess.
        params[name] = Array.isArray(value) ? String(value[value.length - 1]) : String(value);
      }

      const limit = fhir.parseLimit(req.query._count);
      if (limit === null) {
        return sendOutcome(res, 400, '_count must be a positive integer.');
      }

      // `_id` is a read dressed as a one-entry searchset.
      if (params._id !== undefined) {
        const resource = await fhir.read(config, resourceType, params._id);
        return sendResource(res, searchsetBundle(
          resource ? [resource] : [],
          serviceBase(req),
          [{ relation: 'self', url: selfUrl(req) }],
          resource ? 1 : 0,
        ));
      }

      const cursor = req.query._cursor ? String(req.query._cursor) : null;
      const result = await fhir.search(config, resourceType, params, cursor, limit);
      if (result.error) {
        return sendOutcome(res, 400, result.error);
      }
      const links = [{ relation: 'self', url: selfUrl(req) }];
      if (result.cursor) {
        links.push({ relation: 'next', url: nextUrl(req, result.cursor) });
      }
      return sendResource(res, searchsetBundle(result.resources, serviceBase(req), links));
    }),

    /**
     * @openapi
     * /api/v1/fhir/{resourceType}/{id}:
     *   get:
     *     description: >-
     *       Returns one configured FHIR resource. An Observation id is synthesised as
     *       `<reportUuid>.<code>`, because one report projects to many observations.
     *     summary: Read a FHIR resource
     *     operationId: v1FhirResourceTypeIdGet
     *     tags: [FHIR]
     *     x-permissions: { hasAll: [can_access_fhir_api] }
     *     x-since: 5.4.0
     *     parameters:
     *       - in: path
     *         name: resourceType
     *         required: true
     *         schema:
     *           type: string
     *         description: A configured FHIR resource type, such as Patient.
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: The resource id.
     *     responses:
     *       200:
     *         description: A FHIR resource.
     *         content:
     *           application/fhir+json:
     *             schema:
     *               type: object
     *       401:
     *         $ref: '#/components/responses/Unauthorized'
     *       403:
     *         $ref: '#/components/responses/Forbidden'
     *       404:
     *         description: No resource of that type and id is served.
     *         content:
     *           application/fhir+json:
     *             schema:
     *               type: object
     */
    read: doOrOutcome(async (req, res) => {
      await assertPermission(req);
      const { resourceType, id } = req.params;
      const config = requireResourceType(res, resourceType);
      if (!config) {
        return;
      }
      const resource = await fhir.read(config, resourceType, id);
      if (!resource) {
        return sendOutcome(res, 404, `${resourceType}/${id} not found.`);
      }
      return sendResource(res, resource);
    }),
  },
};
