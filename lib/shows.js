exports.inbox = function(doc, req) {
    var ddoc = this;
    var baseUrl = '/' + req.path.slice(0, 3).join('/') + '/_rewrite';
    return {
        body: ddoc.inbox_template.replace(/<%= baseURL %>/g, baseUrl)
    };
};

exports.status = function (doc, req) {
    // if we can get this far, the app is running
    return {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ready: true })
    };
};

exports.not_found = function (doc, req) {
    return {
        code: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'not-found' })
    };
};

// Null migration for backwards compatibility:
// https://github.com/medic/medic-webapp/issues/1892
exports.migration = function(doc, req) {
    try {
        var body = JSON.parse(req.body);
        return JSON.stringify(body.settings);
    } catch(e) {
        throw 'Could not parse request body as JSON';
    }
};
