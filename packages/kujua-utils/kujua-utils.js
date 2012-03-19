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
    levels: {silent:0, error:1, info:2, debug:3},
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

exports.isUserAdmin = function(userCtx) {
    return userCtx.roles.indexOf('national_admin') !== -1;
};

exports.getUserDistrict = function(userCtx) {

    // FIX
    if (userCtx.name === 'bassila') {
        return '68d45afe29fbf23d1cb9ee227345ee82';
    } else if (userCtx.name === 'tchaourou') {
        return '68d45afe29fbf23d1cb9ee227345ec08';
    }

    // problem when new records come in, the cookie seems to get reset.
    //cookies.readBrowserCookie('kujua_facility'),
};

