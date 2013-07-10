var _ = require('underscore'),
    url = require('url');

/**
 * This has to run in the shows/list/update context for 'this' to work
 * Specifically, needs patched duality/core.js to have correct context
 */
exports.getAppInfo = function() {
    var info,
        muvuku;

    info = {
        muvuku_webapp_url: '/json-forms/_design/json-forms/_rewrite/?_embed_mode=2'
    };

    _.extend(info, this.app_settings || {});

    if (this.app_settings && this.app_settings.muvuku_webapp_url) {
        info.muvuku_webapp_url = this.app_settings.muvuku_webapp_url;
    }
    muvuku = url.parse(info.muvuku_webapp_url, true);
    muvuku.search = null;
    muvuku.query.sync_url = require('duality/core').getBaseURL() + '/add';
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
