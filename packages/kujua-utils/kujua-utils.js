var jsDump = require('jsDump'),
    _ = require('underscore')._,
    settings = require('settings/root');

exports.prettyMonth = function (month, full) {
    var months_short = new Array(
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
        'Sep', 'Oct', 'Nov', 'Dec');
    var months_full = _.map(exports.months(), function(month) { return month[1]; });

    if (full) {
        return months_full[month];
    }
    
    return months_short[month];
};

exports.months = function () {
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
            log(obj);
        }
    },
    silent: function (obj) {},
    error: function (obj) {
        if (this.levels[settings.loglevel] >= this.levels['error']) {
            this.log(obj);
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
    return userCtx.roles.indexOf('national_admin') !== -1 ||
           userCtx.roles.indexOf('_admin') !== -1;
};

exports.hasPerm = function(userCtx, perm) {
    if (!userCtx || !perm) { return false; }
    switch (perm) {
        case 'can_edit_facility':
            return _.indexOf(userCtx.roles, '_admin') !== -1 ||
                   _.indexOf(userCtx.roles, 'national_admin') !== -1 ||
                   _.indexOf(userCtx.roles, 'district_admin') !== -1;
        case 'can_edit_any_facility':
            return _.indexOf(userCtx.roles, '_admin') !== -1 ||
                   _.indexOf(userCtx.roles, 'national_admin') !== -1;
        default:
            return false;
    }
};

exports.getUserDistrict = function(userCtx) {
    return userCtx.kujua_facility;
};

/**
 * Return a title-case version of the supplied string.
 * @name titleize(str)
 * @param str The string to transform.
 * @returns {String}
 * @api public
 */
exports.titleize = function (str) {
    return (str || '').toLowerCase().replace(/_+/g, ' ').replace(
        /(?:^|\s+)\w/g, function (m) {
            return m.toUpperCase();
        }
    );
};

