/**
 * This has to run in the shows/list/update context for 'this' to work
 * Specifically, needs patched duality/core.js to have correct context
 */
exports.getAppInfo = function() {
    var gateway,
        info,
        muvuku,
        app_settings = getSettings.call(this),
        _ = _ || require('underscore'),
        url = url || require('url');

    /*
     * On server side app_settings is availble on design doc (this) and if
     * call from client side we fetch app_settings via couchdb show.
     *
     * returns object
     */
    function getSettings() {
        if (this.app_settings) {
            return this.app_settings;
        } else if (typeof(window) === 'object' && window.jQuery) {
            return JSON.parse(
                window.jQuery.ajax({
                    type: "GET",
                    url: require('duality/core').getBaseURL() + '/app_settings.json',
                    async: false //synchronous request
                }).responseText
            );
        } else {
            return {};
        }
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
        var val = null;
        if (value) {
            if (value[locale]) {
                // we found specified locale
                val = value[locale];
            } else if (value.en) {
                // default to english if it exists
                val = value.en;
            } else {
                // otherwise return the first value in object
                for (var k in value) {
                    val = value[k];
                    continue;
                }
            }
        }
        return val;
    }

    function translate(translations, key, locale) {
        var value;

        locale = locale || 'en';

        if (_.isObject(key))
            return getMessage(key, locale) || key;

        value = _.findWhere(translations, {
            key: key
        });

        return getMessage(value, locale) || key;
    }

    info = {
        muvuku_webapp_url: '/json-forms/_design/json-forms/_rewrite/?_embed_mode=2'
    };

    if (app_settings) {
        gateway = app_settings.gateway_number;

        info.muvuku_webapp_url = info.muvuku_webapp_url || app_settings.muvuku_webapp_url;

        _.extend(info, app_settings);
    }

    muvuku = url.parse(info.muvuku_webapp_url, true);
    muvuku.search = null;
    muvuku.query._sync_url = require('duality/core').getBaseURL() + '/add';

    if (gateway) {
        muvuku.query._gateway_num = gateway;
    }

    info.muvuku_webapp_url = url.format(muvuku);

    info.sha = this.kanso && this.kanso.git && this.kanso.git.commit;

    info.translations = info.translations || [];

    info.translate = _.partial(translate, info.translations);
    info.getMessage = getMessage;

    return info;
};
