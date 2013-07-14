var couchr = require('couchr');

module.exports = {
    after: "modules/cleanup",
    run : function(root, path, settings, doc, callback) {
        var ddoc_url = settings._url + '/_design/' + settings.name;
        // for older kanso versions
        if (!ddoc_url) callback(null, doc);
        get_doc(ddoc_url, settings, function(err, ddoc) {
            if (ddoc.app_settings) doc.app_settings = ddoc.app_settings;
            callback(null, doc);
        });
    }
}


function get_doc(ddoc_url, settings, callback) {
    couchr.get(ddoc_url, function(err, resp){
        if (err && err.error === 'unauthorized') return auth(ddoc_url, settings, callback);
        if (err) return callback(err);
        callback(null, resp);
    });
}


function auth(ddoc_url, settings, callback) {
    console.log('Credentials are needed to access previous app_settings: ');
    settings._utils.getAuth(ddoc_url, function(err, auth_ddoc_url){
        get_doc(auth_ddoc_url, settings, callback);
    });
}