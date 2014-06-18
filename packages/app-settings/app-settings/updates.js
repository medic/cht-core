/**
 * Update the app_setings of the ddoc with the body of the req. Recursively
 * merge object properties. Where the property value is an array the
 * property is overwritten completely.
 *
 * @exports
 * @param {Object} ddoc Design document to update
 * @param {Object} req The request. The request body must be valid JSON.
 * @return {Array} The updated ddoc and the response body.
 */
exports.update_config = function (ddoc, req) {

    var replace = req.query && req.query.replace;

    return [
        ddoc,
        JSON.stringify(_process(ddoc, req.body, replace))
    ];

};

/**
 * @private
 * @param {Object} ddoc Design document to update
 * @param {String} body The request body. Must be valid JSON.
 */
var _process = function (ddoc, body, replace) {

    if (!ddoc) {
        return {
            success: false,
            error: 'Design document not found'
        };
    }

    try {
        body = JSON.parse(body);
        if (replace) {
            _replace(ddoc.app_settings, body);
        } else {
            _extend(ddoc.app_settings, body);
        }
        return { success: true };
    } catch(e) {
        return {
            success: false,
            error: 'Request body must be valid JSON'
        };
    }

};

/**
 * @private
 * @param {Object} target The settings to update into.
 * @param {Object} source The new settings to update from.
 */
var _replace = function (target, source) {
    for (var k in source) {
        target[k] = source[k];
    }
}

/**
 * @private
 * @param {Object} target The settings to update into.
 * @param {Object} source The new settings to update from.
 */
var _extend = function (target, source) {
    for (var k in source) {
        if (_isObject(source[k])) {
            // object, recurse
            if (!target[k]) {
                target[k] = {};
            }
            _extend(target[k], source[k]);
        } else {
            // simple property or array
            target[k] = source[k];
        }
    }
};

/**
 * @private
 * @param {Object} obj
 */
var _isObject = function (obj) {
    return obj === Object(obj) && toString.call(obj) !== '[object Array]';
};
