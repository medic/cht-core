var _ = require('underscore'),
    url = require('url');

/*
 * On server side app_settings is availble on design doc (this) and if
 * call from client side we fetch app_settings via couchdb show.
 *
 * returns object
 */
function getSettings() {
    if (this.app_settings) {
        return this.app_settings;
    }
    if (typeof(window) === 'object' && window.jQuery) {
        return JSON.parse(
            window.jQuery.ajax({
                type: "GET",
                url: require('duality/core').getBaseURL() + '/app_settings.json',
                async: false //synchronous request
            }).responseText
        );
    }
    return {};
}

/**
 * This has to run in the shows/list/update context for 'this' to work
 * Specifically, needs patched duality/core.js to have correct context
 */
exports.getAppInfo = function() {
    var gateway,
        info,
        muvuku,
        app_settings = getSettings();

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

    if (info.translations) {
        _.each(info.translations, function(t) {
            if (t.key && !info[t.key]) {
                info[t.key] = t.value;
            }
        })
    }
    return info;
};
