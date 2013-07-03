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

    if (_.isNumber(strings)) { return strings.toString(); }

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
        }
        if (typeof(log) !== 'undefined') {
            if (_.isObject(obj))
                log(JSON.stringify(obj));
            else
                log(obj);
        }
    },
    log_error: function(obj) {
        if (typeof(console) !== 'undefined') {
            console.error(obj);
        }
        if (typeof(log) !== 'undefined') {
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
    return userCtx.roles.indexOf('national_admin') !== -1 ||
           userCtx.roles.indexOf('_admin') !== -1;
};

exports.isUserDistrictAdmin = function(userCtx) {
    return userCtx.roles.indexOf('district_admin') !== -1;
};

exports.hasPerm = function(userCtx, perm) {
    var permissions = {
        can_edit_facility: ['national_admin', 'district_admin'],
        can_edit_any_facility: ['national_admin'],
        can_view_revisions: [],
        can_view_sms_message: []
    };

    if (!userCtx || !perm) {
        return false;
    }

    if (permissions[perm]) {
        // admins can do anything
        return _.intersection(userCtx.roles, ['_admin'].concat(permissions[perm])).length > 0;
    } else {
        // if permission doesn't exist, it is always false
        return false;
    }
};

exports.getUserDistrict = function(userCtx, callback) {
    var district = '';
    if (userCtx.kujua_facility)
        district = userCtx.kujua_facility;
    else
        district = cookies.readBrowserCookies()['kujua_facility'];
    if (!district) {
        users.get(userCtx.name, function(err, user) {
            if (err) return callback(err);
            callback(null, user.kujua_facility);
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
    title = title || exports.titleize(key);
    $('.page-header h1').text($.kansoconfig(title));
    if (key) {
        $('body').attr('data-page', key);
    }
    $('.page-header .controls').hide();
    $('.page-header .container').attr('class', 'container');
    $('body > .container div').filter(':first').attr('class','content');
};


exports.getConfigLabels = function() {
    if (!$ || !$.kansoconfig) return {};
    return {
      'Clinic': $.kansoconfig('Clinic'),
      'Clinic_Contact': $.kansoconfig('Clinic Contact'),
      'Health_Center': $.kansoconfig('Health Center'),
      'RC_Code': $.kansoconfig('RC Code'),
      'Facility': $.kansoconfig('Facility'),
      'District': $.kansoconfig('District')
    }
}

