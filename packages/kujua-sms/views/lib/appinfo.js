var _ = require('underscore'),
    url = require('url');

/**
 * This has to run in the shows/list/update context for 'this' to work
 * Specifically, needs patched duality/core.js to have correct context
 */
exports.getAppInfo = function(user) {
    var gateway,
        info,
        muvuku;

    info = {
        muvuku_webapp_url: '/json-forms/_design/json-forms/_rewrite/?_embed_mode=2'
    };


    if (this.app_settings) {
        gateway = this.app_settings.gateway_number;

        info.muvuku_webapp_url = info.muvuku_webapp_url || this.app_settings.muvuku_webapp_url;
    }

    muvuku = url.parse(info.muvuku_webapp_url, true);
    muvuku.search = null;
    muvuku.query._sync_url = require('duality/core').getBaseURL() + '/add';

    if (gateway) {
        muvuku.query._gateway_num = gateway;
    }

    info.muvuku_webapp_url = url.format(muvuku);

    _.extend(info, {
        gateway_number: gateway,
        sha: this.kanso && this.kanso.git && this.kanso.git.commit
    });

    return info;
};
