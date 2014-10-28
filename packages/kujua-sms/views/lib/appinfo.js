/**
 * This has to run in the shows/list/update context for 'this' to work
 * Specifically, needs patched duality/core.js to have correct context
 */
exports.getAppInfo = function(req) {
    var defaults = require('views/lib/app_settings'),
        app_settings = getSettings.call(this, req),
        _ = _ || require('underscore'),
        url = url || require('url');

    // use mustache syntax
    _.templateSettings = {
      interpolate : /\{\{(.+?)\}\}/g
    };


    /*
     * Return a json form
     */
    function getForm(code) {
        return this.forms && this.forms[code];
    };


    /*
     * On server side app_settings is available on design doc (this) and if
     * call from client side we fetch app_settings via couchdb show.
     *
     * returns object
     */
    function getSettings(req) {
        var settings = {};

        if (this.app_settings) {
            // server side
            settings = this.app_settings;
        } else if (typeof(window) === 'object' && window.jQuery) {
            // client side
            var baseURL = require('duality/utils').getBaseURL();
            settings = JSON.parse(
                window.jQuery.ajax({
                    type: 'GET',
                    url: baseURL + '/app_settings/medic',
                    async: false //synchronous request
                }).responseText
            ).settings;
        }

        // add defaults to settings if needed
        for (var k in defaults) {
            if (typeof defaults[k] !== 'undefined') {
                if (typeof settings[k] === 'undefined') {
                    settings[k] = defaults[k];
                }
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
                if (settings.translations) {
                    settings.translations.push(d);
                } else {
                    settings.translations = [d];
                }
            }
            found = false;
        }

        return settings;
    }

    /*
     * Value is object with locale strings, e.g.
     *
     *   {
     *       "key": "Search",
     *       "default": "Search",
     *       "translations": [
     *           {
     *               "locale": "en",
     *               "content": "Search"
     *           },
     *           {
     *               "locale": "fr",
     *               "content": "Search"
     *           }
     *       ]
     *   }
     *
     * return string
     */
    function getMessage(value, locale) {

        function _findTranslation(value, locale) {
            if (value.translations) {
                var translation = _.findWhere(
                    value.translations, { locale: locale }
                );
                return translation && translation.content;
            } else {
                // fallback to old translation definition to support
                // backwards compatibility with existing forms
                return value[locale];
            }
        }

        if (!_.isObject(value)) {
            return value;
        }

        var result =

            // 1) Look for the requested locale
            _findTranslation(value, locale)

            // 2) Look for the default
            || value.default

            // 3) Look for the English value
            || _findTranslation(value, 'en')

            // 4) Look for the first translation
            || (value.translations && value.translations[0] 
                && value.translations[0].content)

            // 5) Look for the first value
            || value[_.first(_.keys(value))];

        return result;
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
            locale = locale || app_settings.locale;

        if (_.isObject(locale)) {
            ctx = locale;
            locale = app_settings.locale;
        }

        if (_.isObject(key)) {
            return getMessage(key, locale) || key;
        }

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
    muvuku.query._sync_url = require('duality/utils').getBaseURL() + '/add';

    if (app_settings.gateway_number) {
        muvuku.query._gateway_num = app_settings.gateway_number;
    }

    app_settings.muvuku_webapp_url = url.format(muvuku);
    app_settings.sha = this.kanso && this.kanso.git && this.kanso.git.commit;
    app_settings.translations = app_settings.translations || [];
    app_settings.translate = _.partial(translate, app_settings.translations);
    app_settings.getMessage = getMessage;
    app_settings.getForm = getForm;

    return app_settings;
};
