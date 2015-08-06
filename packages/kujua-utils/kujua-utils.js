var _ = require('underscore'),
    users = require('users'),
    cookies = require('cookies');

var logger = exports.logger = {
    levels: {silent:0, error:1, warn:2, info:3, debug:4},
    log: function(obj) {
        if (typeof(console) !== 'undefined') {
            console.log(obj);
        } else if (typeof(log) !== 'undefined') {
            if (_.isObject(obj))
                log(JSON.stringify(obj));
            else
                log(obj);
        }
    },
    log_error: function(obj) {
        if (typeof(console) !== 'undefined') {
            console.error(obj);
        } else if (typeof(log) !== 'undefined') {
            log('Medic Mobile ERROR:');
            if (_.isObject(obj))
                log(JSON.stringify(obj,null,2));
            else
                log(obj);
        }
    },
    silent: function (obj) {},
    error: function (obj) {
        this.log_error(obj);
    },
    warn: function (obj) {
        this.log(obj);
    },
    info: function (obj) {
        this.log(obj);
    },
    debug: function (obj) {
        this.log(obj);
    }
};

/* poorly named */
exports.isUserAdmin = function(userCtx) {
    return exports.isUserNationalAdmin(userCtx) || exports.isDbAdmin(userCtx);
};

exports.isUserNationalAdmin = function(userCtx) {
    return exports.hasRole(userCtx, 'national_admin');
};

exports.isUserDistrictAdmin = function(userCtx) {
    return exports.hasRole(userCtx, 'district_admin');
};

exports.isDbAdmin = function(userCtx) {
    return exports.hasRole(userCtx, '_admin');
};

exports.hasRole = function(userCtx, role) {
    return _.contains(userCtx && userCtx.roles, role);
};

exports.hasPerm = function(userCtx, perm) {
    var permissions = {
        can_backup_facilities: ['national_admin'],
        can_edit_facility: ['national_admin', 'district_admin'],
        can_edit_any_facility: ['national_admin'],
        can_view_revisions: [],
        can_view_sms_message: [],
        can_export_messages: ['national_admin', 'district_admin', 'analytics'],
        can_export_forms: ['national_admin', 'district_admin', 'analytics'],
        can_export_audit: ['national_admin'],
        can_export_feedback: ['national_admin']
    };

    if (!userCtx || !userCtx.roles || userCtx.roles.length === 0) {
        // user has no roles
        return false;
    }

    if (!perm || !permissions[perm]) {
        // unknown permission
        return false;
    }

    if (exports.isDbAdmin(userCtx)) {
        // admins can do anything
        return true;
    }

    return _.intersection(userCtx.roles, permissions[perm]).length > 0;
};

exports.checkDistrictConstraint = function(userCtx, db, callback) {
    getUserDistrict(userCtx, function(err, facility) {
        if (err) {
            return callback(err);
        }
        if (!facility) {
            return callback(new Error('No district assigned to district admin.'));
        }
        db.getDoc(facility, function(err, doc) {
            if (err) {
                if (err.error === 'not_found') {
                    return callback(new Error('No facility found with id "' + facility + '". Your admin needs to update the Facility Id in your user details.'));
                }
                return callback(err);
            }
            callback(null, facility);
        });
    });
};

var getUserDistrict = function(userCtx, callback) {
    var district = userCtx.facility_id;
    if (!district && typeof(window) !== 'undefined') {
        district = cookies.readBrowserCookies()['facility_id'];
    }
    if (district) {
        return callback(null, district);
    }
    users.get(userCtx.name, function(err, user) {
        if (err) return callback(err);
        callback(null, user.facility_id);
    });
};

/**
 * Update task/message object in-place.  Used by message update functions when
 * a message's state changes. Also adds new values to state history.
 *
 * @param {Object} task
 * @param {String} state
 * @param {Any} details (optional)
 * @api public
 */
exports.setTaskState = function(task, state, details) {
    task.state = state;
    task.state_details = details;
    task.state_history = task.state_history || [];
    task.state_history.push({
        state: state,
        state_details: details,
        timestamp: new Date().toISOString()
    });
};
