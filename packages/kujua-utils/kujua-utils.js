var jsDump = require('jsDump'),
    _ = require('underscore')._,
    settings = require('settings/root');

exports.getUserLocale = function(req) {
    if (req.query.locale)
        return req.query.locale;
    return req.userCtx ? req.userCtx.locale : undefined;
};

/*
 * Resolve language string object based on fallback or specified locale.
 *
 * @param {Object} strings - object with locale strings as keys
 * @param {Array|String} locales - locale strings, e.g. 'en', 'fr', 'en-gb' or
 *                                 ['en', 'fr']
 * @return {String} - string value based on locale
 *
 * @api public
 */
var localizedString = exports.localizedString = function(strings, locales) {

    var str = '',
        locales = _.isUndefined(locales) ? [] : locales;

    locales = _.isString(locales) ? [locales] : locales;

    if (_.isUndefined(strings)) { return ''; }

    if (_.isString(strings)) { return strings; }

    // search for locale
    for (var i in locales) {
        var locale = locales[i];
        if (strings[locale]) {
            str =  strings[locale];
            break;
        }
    }

    if (!str && _.isObject(strings)) {
        // just pick the first value if strings looks like a language/locale
        // based object
        var k = _.first(_.keys(strings))
        str = strings[k];
    }

    return str.replace('\\n', ': ');

};

exports.capitalize = function (str) {
    return str.replace( /(^|\s)([a-z])/g , function(m,p1,p2){ 
        return p1+p2.toUpperCase(); 
    });
};

exports.prettyMonth = function (month, full) {
    var months_short = new Array(
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
        'Sep', 'Oct', 'Nov', 'Dec');
    var months_full = _.map(exports.months(), function(month) { return month[1]; });

    if (full)
        return months_full[month];

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
    log_error: function(obj) {
        if (typeof(console) !== 'undefined') {
            console.error(obj);
        } else if (typeof(log) !== 'undefined') {
            log('ERROR');
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
var titleize = exports.titleize = function (str) {
    return (str || '').toLowerCase().replace(/[-_]+/g, ' ').replace(
        /(?:^|\s+)\w/g, function (m) {
            return m.toUpperCase();
        }
    );
};

exports.updateTopNav = function(key, title) {
    title = title || titleize(key);
    $('.page-header h1').text($.kansoconfig(title));
    $('.navbar .nav > *').removeClass('active');
    $('.navbar .nav .' + key).addClass('active');
    $('.page-header .controls').hide();
    $('.page-header .container').attr('class','container');
    $('body > .container div').filter(':first').attr('class','content');
};
