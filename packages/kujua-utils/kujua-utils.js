var jsDump = require('jsDump'),
    _ = require('underscore'),
    _s = require('underscore-string'),
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

//unused?
var months = function () {
    return [
        [0, 'January'],
        [1, 'February'],
        [2, 'March'],
        [3, 'April'],
        [4, 'May'],
        [5, 'June'],
        [6, 'July'],
        [7, 'August'],
        [8, 'September'],
        [9, 'October'],
        [10, 'November'],
        [11, 'December']
    ];
};

exports.logger = {
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
            log('Kujua Lite ERROR:');
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

exports.dumper = {
    levels: {silent:0, error:1, warn:2, info:3, debug:4},
    dump: function(obj) {
        if (typeof(console) !== 'undefined') {
            console.log(jsDump.parse(obj));
        } else if (typeof(log) !== 'undefined') {
            log(jsDump.parse(obj));
        }
    },
    silent: function (obj) {},
    error: function (obj) {
        if (this.levels[settings.loglevel] >= this.levels['error']) {
            this.dump(obj);
        }
    },
    warn: function (obj) {
        if (this.levels[settings.loglevel] >= this.levels['warn']) {
            this.dump(obj);
        }
    },
    info: function (obj) {
        if (this.levels[settings.loglevel] >= this.levels['info']) {
            this.dump(obj);
        }
    },
    debug: function (obj) {
        if (this.levels[settings.loglevel] >= this.levels['debug']) {
            this.dump(obj);
        }
    }
};

/* poorly named */
exports.isUserAdmin = function(userCtx) {
    return exports.hasRole(userCtx, 'national_admin') || exports.isDbAdmin(userCtx);
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
        can_export_messages: ['national_admin', 'district_admin'],
        can_export_forms: ['national_admin', 'district_admin'],
        can_export_audit: ['national_admin']
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

exports.getUserDistrict = function(userCtx, callback) {
    var district = '';
    if (userCtx.facility_id)
        district = userCtx.facility_id;
    else
        district = cookies.readBrowserCookies()['facility_id'];
    if (!district) {
        users.get(userCtx.name, function(err, user) {
            if (err) return callback(err);
            callback(null, user.facility_id);
        });
    } else {
        callback(null, district);
    }
};

/**
 * Return a title-case version of the supplied string.
 * @name titleize(str)
 * @param str The string to transform.
 * @returns {String}
 * @api public
 */
exports.titleize = function (s) {
    return _s.titleize(_s.humanize(s));
};

exports.updateTopNav = function(key, title) {
    if (!_.isNull(title)) {
        title = title || exports.titleize(key);
        $('.page-header h1').replaceWith('<h1 class="pull-left">' + $.kansotranslate(title) + '</h1>');
    } else {
        $('.page-header h1').hide();
    }
    if (key) {
        $('body').attr('data-page', key);
    }
    $('.page-header .controls').hide();
    $('.page-header .container').attr('class', 'container');
    $('body > .container div').filter(':first').attr('class','content');
};

exports.setTaskState = function(task, state) {
    task.state = state;
    task.state_history = task.state_history || [];
    task.state_history.push({
        state: state,
        timestamp: new Date().toISOString()
    });
};