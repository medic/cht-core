
exports.update_config = function (doc, req) {

    return [
        doc, 
        JSON.stringify(_process(doc, req))
    ];

};

var _process = function (doc, req) {

    if (!doc) {
        return {
            success: false, 
            error: 'Design document not found'
        };
    } 

    var body;
    try {
        body = JSON.parse(req.body);
    } catch(e) {
        return {
            success: false, 
            error: 'Request body must be valid JSON'
        };
    }

    _extend(doc.app_settings, body);

    return { success: true, settings: body };

};

var _extend = function (target, source) {
    for (var k in source) {
        if (typeof source[k] === 'object') {
            // nested property, recurse
            if (!target[k]) {
                target[k] = {};
            }
            _extend(target[k], source[k]);
        } else {
            // simple property
            target[k] = source[k];
        }
    }
};