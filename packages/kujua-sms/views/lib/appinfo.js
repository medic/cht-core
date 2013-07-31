/**
 * This has to run in the shows/list/update context for 'this' to work
 * Specifically, needs patched duality/core.js to have correct context
 */
exports.getAppInfo = function() {
    var defaults = require('views/lib/app_settings'),
        app_settings = getSettings.call(this),
        _ = _ || require('underscore'),
        url = url || require('url');

    // use mustache syntax
    _.templateSettings = {
      interpolate : /\{\{(.+?)\}\}/g
    };

    /*
     * On server side app_settings is availble on design doc (this) and if
     * call from client side we fetch app_settings via couchdb show.
     *
     * returns object
     */
    function getSettings() {
        var settings = {};

        if (this.app_settings) {
            settings = this.app_settings;
        } else if (typeof(window) === 'object' && window.jQuery) {
            settings = JSON.parse(
                window.jQuery.ajax({
                    type: "GET",
                    url: require('duality/core').getBaseURL() + '/app_settings.json',
                    async: false //synchronous request
                }).responseText
            );
        }

        // add defaults to settings if needed
        for (var k in defaults) {
            if (defaults[k] && !settings[k]) {
                settings[k] = defaults[k];
            }
        }

        // add default translations also if needed
        for (var i in defaults.translations) {
            var d = defaults.translations[i];
            var found = false;
            for (var i in settings.translations) {
                var t = settings.translations[i];
                if (t.key === d.key) {
                    found = true;
                }
            }
            if (!found) {
                settings.translations.push(d);
            }
            found = false;
        }
        return settings;
    }

    /*
     * Value is object with locale strings, e.g.
     *
     * {
     *   "en": "Year",
     *   "fr": "Anné"
     * }
     *
     * return string
     */
    function getMessage(value, locale) {
        var key;

        locale = locale || 'en';

        if (_.isObject(value)) {
            // try to resolve locale
            if (value[locale]) {
                // we found specified locale
                return value[locale];
            } else {
                // otherwise return the first value in object
                key = _.first(_.keys(value));

                return value[key] || null; // return null if falsey or empty object
            }
        } else {
            return value;
        }
    }

    /*
     * Translate a given string or translation object based on translations and
     * locale.
     *
     * @param {Array} translations
     * @param {Object|String} key
     * @param {String} locale
     *
     * @return String
    */
    function translate(translations, key, locale, ctx) {
        var value,
            ctx = ctx || {},
            locale = locale || 'en';

        if (_.isObject(locale)) {
            ctx = locale;
            locale = 'en';
        }

        if (_.isObject(key))
            return getMessage(key, locale) || key;

        value = _.findWhere(translations, {
            key: key
        });

        value = getMessage(value, locale) || key;

        // underscore templates will return ReferenceError if all variables in
        // template are not defined.
        try {
            return _.template(value, ctx);
        } catch(e) {
            return value;
        }
    }

    var muvuku = url.parse(app_settings.muvuku_webapp_url, true);
    muvuku.search = null;
    muvuku.query._sync_url = require('duality/core').getBaseURL() + '/add';

    if (app_settings.gateway_number) {
        muvuku.query._gateway_num = app_settings.gateway_number;
    }

    app_settings.muvuku_webapp_url = url.format(muvuku);
    app_settings.sha = this.kanso && this.kanso.git && this.kanso.git.commit;
    app_settings.translations = app_settings.translations || [];
    app_settings.translate = _.partial(translate, app_settings.translations);
    app_settings.getMessage = getMessage;

    return app_settings;
};
