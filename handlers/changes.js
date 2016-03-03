var auth = require('../auth'),
    config = require('../config'),
    serverUtils = require('../server-utils');

var filterIsDocByPlace = function(req) {
  var split = req.query && req.query.filter && req.query.filter.split('/');
  return split && split.length === 2 && split[1] === 'doc_by_place';
};

module.exports = function(proxy, req, res) {
  auth.getUserCtx(req, function(err, userCtx) {
    if (err) {
      return serverUtils.error(err, req, res);
    }
    if (auth.hasAllPermissions(userCtx, 'can_access_directly')) {
      proxy.web(req, res);
    } else {
      auth.getFacilityId(req, userCtx, function(err, facilityId) {
        if (err) {
          return serverUtils.serverError(err.message, req, res);
        }
        // for security reasons ensure the params haven't been tampered with
        if (filterIsDocByPlace(req)) {
          var unassigned = config.get('district_admins_access_unallocated_messages') &&
                           auth.hasAllPermissions(userCtx, 'can_view_unallocated_data_records');

          // replicating docs - check facility and unassigned settings
          if (req.query.id !== facilityId ||
              (req.query.unassigned === 'true' && !unassigned)) {
            console.error('Unauthorized replication attempt - restricted filter params');
            return serverUtils.error({ code: 403, message: 'Forbidden' }, req, res);
          }
        } else if (req.query.filter === '_doc_ids') {
          // replicating medic-settings only
          if (req.query.doc_ids !== '["_design/medic"]') {
            console.error('Unauthorized replication attempt - restricted filter id: ' + req.query.doc_ids);
            return serverUtils.error({ code: 403, message: 'Forbidden' }, req, res);
          }
        } else {
          // unknown replication filter
          console.error('Unauthorized replication attempt - restricted filter: ' + req.query.filter);
          return serverUtils.error({ code: 403, message: 'Forbidden' }, req, res);
        }
        proxy.web(req, res);
      });
    }
  });
};
