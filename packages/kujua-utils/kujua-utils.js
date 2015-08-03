var _ = require('underscore'),
    settings = require('settings/root'),
    users = require('users'),
    cookies = require('cookies');


exports.getUserLocale = function(req) {
    if (req.query.locale)
        return req.query.locale;
    return req.userCtx ? req.userCtx.locale : undefined;
};

exports.capitalize = function (str) {
    return str.replace( /(^|\s)([a-z])/g , function(m,p1,p2){
        return p1+p2.toUpperCase();
    });
};

exports.prettyMonth = function (month, full) {
    var months_short = {
        1:'Jan', 2:'Feb', 3:'Mar', 4:'Apr', 5:'May', 6:'Jun', 7:'Jul', 8:'Aug',
        9:'Sep', 10:'Oct', 11:'Nov', 12:'Dec'
    };
    var months_full = {
        1:'January', 2:'February', 3:'March', 4:'April', 5:'May', 6:'June',
        7:'July', 8:'August', 9:'September', 10:'October', 11:'November',
        12:'December'
    };

    if (full)
        return months_full[month];

    return months_short[month];
};

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
        if (this.levels[settings.loglevel] >= this.levels['error']) {
            this.log_error(obj);
        }
    },
    warn: function (obj) {
        if (this.levels[settings.loglevel] >= this.levels['warn']) {
            this.log(obj);
        }
    },
    info: function (obj) {
        if (this.levels[settings.loglevel] >= this.levels['info']) {
            this.log(obj);
        }
    },
    debug: function (obj) {
        if (this.levels[settings.loglevel] >= this.levels['debug']) {
            this.log(obj);
        }
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
        can_export_feedback: ['national_admin'],
        can_view_unallocated_data_records: ['national_admin', 'district_admin', 'gateway']
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
    exports.getUserDistrict(userCtx, function(err, facility) {
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

exports.getUserDistrict = function(userCtx, callback) {
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
 * Return a title-case version of the supplied string.
 * @name titleize(str)
 * @param str The string to transform.
 * @returns {String}
 * @api public
 */
exports.titleize = function (s) {
    return s.trim()
        .toLowerCase()
        .replace(/([a-z\d])([A-Z]+)/g, '$1_$2')
        .replace(/[-\s]+/g, '_')
        .replace(/_/g, ' ')
        .replace(/(?:^|\s|-)\S/g, function(c) {
            return c.toUpperCase();
        });
};

exports.updateTopNav = function(key, title) {
    if (key) {
        $('body').attr('data-page', key);
    }
    $('#topnavlinks .mm-button-text').text(title || '');
    $('.page-header .controls').hide();
    $('.page-header .container').attr('class', 'container');
    $('body > .container div').filter(':first').attr('class', 'content');
};

/*
 * Return task object that matches message uuid or a falsey value if match
 * fails.
 */
exports.getTask = function(uuid, doc, type) {
    type = type || 'message';
    var ret;
    if (!uuid || !doc || !doc.tasks) {
        return;
    }
    if (type === 'message') {
        for (var i in doc.tasks) {
            for (var j in doc.tasks[i].messages) {
                if (uuid === doc.tasks[i].messages[j].uuid) {
                    return doc.tasks[i];
                }
            }
        };
    }
    return ret;
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
