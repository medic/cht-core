var couchr = require('couchr');

module.exports = {
    after: "modules/cleanup",
    run : function(root, path, settings, doc, callback) {
        var ddoc_url;
        // for older kanso versions
        if (settings._url) {
            ddoc_url = settings._url + '/_design/' + settings.name;
            get_doc(ddoc_url, settings, function(err, ddoc) {
                if (err) return callback(err);
                doc.app_settings = ddoc.app_settings ? ddoc.app_settings : {};
                callback(null, doc);
            });
        } else {
            return callback(null, doc);
        }
    }
};


function get_doc(ddoc_url, settings, callback) {
    couchr.get(ddoc_url, function(err, resp){
        if (err && err.error === 'unauthorized') return auth(ddoc_url, settings, callback);
        if (err && err.response.statusCode === 404) return callback(null, {}); // no design doc. First push.
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
