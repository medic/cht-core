var info = require('views/lib/appinfo');

exports.test_sms_forms = function (doc, req) {
    return {foo:'test'};
};

exports.list_forms = function(doc, req) {
    var app_info = info.getAppInfo.apply(this),
        ret = [],
        code = req.query.code;
    if (code) {
        ret = app_info.getForm(code) || {};
    } else {
        ret = ret.concat(app_info.getForms());
    }
    return JSON.stringify(ret);
};
