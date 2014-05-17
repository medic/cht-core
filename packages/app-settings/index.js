(function (root, factory) {
    if (typeof exports === 'object') {
        module.exports = factory( require('couchr'));
    } else if (typeof define === 'function' && define.amd) {
        define(['couchr'],factory);
    } else {
        root.app_settings = factory(root.couchr);
    }
}(this, function (couchr) {


var app_settings = {};

/**
 * Clear any existing app settings property form a design doc
 */
app_settings.clear = function(ddoc_url, callback) {
    couchr.get(ddoc_url, function(err, current_doc) {
        if (err) return callback(err);
        if (!current_doc.app_settings) return(null);
        delete current_doc.app_settings;
        couchr.put(ddoc_url, current_doc, callback);
    });
};

/**
 * copy app settings from one design doc to another design doc
 */
app_settings.copy = function(ddoc_url, ddoc_url_to, callback) {
    couchr.get(ddoc_url, function(err, current_doc) {
        if (err) return callback(err);
        if (!current_doc.app_settings) return('No settings exist');


        couchr.get(ddoc_url_to, function(err, target_doc){
            if (err) return callback(err);
            target_doc.app_settings = current_doc.app_settings;
            couchr.put(ddoc_url_to, target_doc, callback);
        });
    });
}

/**
 * Restore app_settings that have been cleared from the last revision of the doc that had app_settings
 */
app_settings.restore = function(ddoc_url, callback) {
    couchr.get(ddoc_url, {revs_info: true}, function(err, resp) {

        var _revs_info = resp._revs_info.slice(1); // eliminate the first one
        var current_doc = resp;
        delete current_doc._revs_info;
        if (current_doc.app_settings) return callback('The current doc has existing app_settings. Please use clear first.');

        app_settings.find_last_app_settings(ddoc_url, _revs_info, function(err, last_app_settings){
            if (err) return callback(err);
            if (!last_app_settings) return callback('No previous app_settings found');

            current_doc.app_settings = last_app_settings;
            couchr.put(ddoc_url, current_doc, callback);

        });
    });
}

/**
 *  Given a doc, and a list of its revisions, return the first revisions app_settings
 */
app_settings.find_last_app_settings = function(ddoc_url, revs_info, callback) {
    if (revs_info.length === 0) return callback(null);
    var rev_details = revs_info[0];
    if (rev_details.status !== 'available') return find_last_app_settings(revs_info.slice(1), callback);

    // get the doc
    couchr.get(ddoc_url, {rev: rev_details.rev}, function(err, rev_doc){
        if (err) return callback(err);
        if (rev_doc.app_settings) return callback(null, rev_doc.app_settings);
        return find_last_app_settings(revs_info.slice(1), callback);
    })
}


return app_settings;


}));
