const auth = require('../../auth');
const serverUtils = require('../../server-utils');

/**
 * Builds a request handler for a paginated GET endpoint. The handler asserts the given permissions, builds the
 * qualifier from the request query, fetches the requested page and returns it as JSON. The shared `cursor` and
 * `limit` query params are passed through to the datasource function.
 * @param {object} opts
 * @param {object} opts.permissions the permissions to assert (passed to `auth.assertPermissions`)
 * @param {(query: object) => object} opts.getQualifier builds the datasource qualifier from `req.query`. May throw
 *   an error object (e.g. `{ status: 400, message }`) to reject the request.
 * @param {(qualifier: object, cursor: string, limit: string) => Promise<object>} opts.getPage the bound datasource
 *   paging function
 * @returns {Function} an express handler
 */
const pageHandler = ({ permissions, getQualifier, getPage }) => serverUtils.doOrError(async (req, res) => {
  await auth.assertPermissions(req, permissions);
  const qualifier = getQualifier(req.query);
  const page = await getPage(qualifier, req.query.cursor, req.query.limit);
  return res.json(page);
});

module.exports = { pageHandler };
