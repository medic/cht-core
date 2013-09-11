var appInfo = require('views/lib/appinfo');

exports.test_sms_forms = function (doc, req) {
    return {foo:'test'};
};

exports.app_settings = function(doc, req) {
    // needs to be called with doc id so we get appropriate ETAG header/caching
    return {
        body: JSON.stringify(appInfo.getAppInfo.call(this) || {}),
        headers: {
            'Content-Type': 'application/json;charset=utf-8'
        }
    }
};

