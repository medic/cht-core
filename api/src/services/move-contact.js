const auth = require('../auth');
const dataContext = require('./data-context');
const serverUtils = require('../server-utils');
const bulkOperations = require('./bulk-operations');
const planners = require('./bulk-operation-planners');
const { NotFoundError, BadRequestError } = require('../errors');
const { BULK_OPERATIONS } = require('@medic/constants');
const { Contact, Qualifier } = require('@medic/cht-datasource');

const { TYPES } = BULK_OPERATIONS;

// parent_id is optional: leaving it out moves the contact to the top level.
const parseParentId = (body) => {
  const parentId = body?.parent_id ?? null;
  if (parentId !== null && (typeof parentId !== 'string' || !parentId)) {
    throw new BadRequestError('parent_id must be a non-empty string');
  }
  return parentId;
};

/**
 * The target is checked before the destination, so an id of the wrong type for the endpoint is
 * reported as such rather than as a missing destination. Both are 404s, which is why they are
 * resolved here rather than left to the planner, whose refusals are 400s.
 */
const resolveTargets = async (getContact, get, { uuid, parentId, type }) => {
  const [ contact, destination ] = await Promise.all([
    get(uuid),
    parentId ? getContact(Qualifier.byUuid(parentId)) : null,
  ]);

  if (!contact) {
    throw new NotFoundError(`${type} not found`);
  }
  if (parentId && !destination) {
    throw new NotFoundError(`Destination contact ${parentId} not found`);
  }
};

/**
 * Builds the move express handler for a contact type. The person and place endpoints move a
 * hierarchy the same way, so they share this handler; each passes the pieces that make its endpoint
 * type-specific. `get` fetches the target as its own type and returns null for the wrong type, so a
 * place cannot be moved through the person endpoint or vice versa, and `type` names it for the
 * not-found message. The handler reads the `dry_run` query param and the optional `parent_id` body
 * property, asserts the required permission, and either returns a dry-run summary (200) or records
 * the operation for Sentinel to plan and run (202).
 * @param {Object} options
 * @param {Function} options.get - fetches the target contact by uuid, or null when it is not this type
 * @param {string} options.type - the contact type name, used in the not-found message
 * @returns {Function} the express request handler
 */
const handleMove = ({ get, type }) => {
  // Bound here, not at module load: both controllers and this module's own tests require it.
  const getContact = dataContext.bind(Contact.v1.get);

  return serverUtils.doOrError(async (req, res) => {
    const dryRun = req.query.dry_run === 'true';
    const userCtx = await auth.assertPermissions(req, { isOnline: true, hasAll: ['can_move_contact_hierarchy'] });

    const parentId = parseParentId(req.body);
    const { uuid } = req.params;
    await resolveTargets(getContact, get, { uuid, parentId, type });

    const params = { contact_id: uuid, parent_id: parentId };
    // Advisory: the caller is told now rather than being handed an operation that can only fail.
    await planners.validate(TYPES.MOVE_CONTACT, params);

    if (dryRun) {
      const { summary } = await planners.plan(TYPES.MOVE_CONTACT, params);
      return res.status(200).json({ summary });
    }

    const id = await bulkOperations.queue(TYPES.MOVE_CONTACT, params, userCtx.name);
    return res.status(202).json({ id });
  });
};

module.exports = {
  handleMove,
};
