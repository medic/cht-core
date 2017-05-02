/**
 * This has to run in the shows/list/update context for 'this' to work
 * Specifically, needs patched duality/core.js to have correct context
 */
exports.getAppInfo = function() {
    var _ = _ || require('underscore'),
        url = url || require('url'),
        cookies = cookies || require('cookies'),
        app_settings = getSettings.call(this);

    // use mustache syntax
    _.templateSettings = {
      interpolate : /\{\{(.+?)\}\}/g
    };


    /*
     * Return a json form
     */
    function getForm(code) {
        return this.forms && this.forms[code];
    }


    /*
     * On server side app_settings is available on design doc (this) and if
     * call from client side we fetch app_settings via couchdb show.
     *
     * returns object
     */
    function getSettings() {
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

        return settings;
    }

    function getLocale() {
        var locale;
        if (typeof window !== 'undefined') {
          locale = cookies.readBrowserCookie('locale');
        }
        return locale || app_settings.locale;
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

        locale = locale || getLocale();

        var test = false;
        if (locale === 'test') {
            test = true;
            locale = 'en';
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

        if (test) {
            result = '-' + result + '-';
        }

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
            ctx = ctx || {};

        if (_.isObject(locale)) {
            ctx = locale;
            locale = null;
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
            return _.template(value)(ctx);
        } catch(e) {
            return value;
        }
    }

    if (app_settings.muvuku_webapp_url) {
        var muvuku = url.parse(app_settings.muvuku_webapp_url, true);
        muvuku.search = null;
        muvuku.query._sync_url = require('duality/utils').getBaseURL() + '/add';

        if (app_settings.gateway_number) {
            muvuku.query._gateway_num = app_settings.gateway_number;
        }

        app_settings.muvuku_webapp_url = url.format(muvuku);
    }

    app_settings.sha = this.kanso && this.kanso.git && this.kanso.git.commit;
    app_settings.translations = app_settings.translations || [];
    app_settings.translate = _.partial(translate, app_settings.translations);
    app_settings.getMessage = getMessage;
    app_settings.getForm = getForm;
    app_settings.getLocale = getLocale;

    return app_settings;
};
