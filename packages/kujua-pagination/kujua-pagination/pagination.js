var querystring = require('querystring'),
    _ = require('underscore')._;

exports.perPage = 10;

var firstRecord = null;
var lastRecord = null;

/**
 * Prepare the rows for pagination. This means reverse them
 * if the query was descending and remove the last element
 * so the limit is correct and assign the first and last
 * element for later use with paginate method.
 *
 * @param {Object} req
 * @param {Array} rows
 * @param {Object} options
 *
 * @api public
 */
exports.prepare = function(req, rows, options) {
    options = options || {};
    exports.perPage = options.perPage || exports.perPage;
    
    if(req.query.descending) {
        rows.reverse();
    }

    if(rows.length > exports.perPage) {
        lastRecord = rows.pop();
    }
    
    firstRecord = rows[0];

    return rows;
};

/**
 * Update next and previous links to successfully paginate
 * through records. The default perPage is 10, but that can
 * be changed in the options.
 *
 * The function expects the next link to have the css class
 * "next" and the prev link to have the css class "prev".
 *
 *
 * @param {Object} head - incl. total_rows, offset, etc.
 * @param {Object} req - incl. descending and other query options
 * @param {String} path - e.g. "/data_records"
 * @param {Object} options - incl. perPage, etc.
 *
 * @api public
 */
exports.paginate = function(head, req, path, options) {
    var baseURL = require('duality/core').getBaseURL(req),
        descending = req.query.descending,
        url = baseURL + path;

    options = options || {};
    exports.perPage = options.perPage || exports.perPage;
    
    delete req.query.descending;
    
    if((head.total_rows > head.offset + exports.perPage) || descending) {
        var query = _.extend(req.query, {
            limit: exports.perPage + 1,
            startkey: JSON.stringify(lastRecord.key)
        });
        
        $('.next').
            attr('href', url + '?' + querystring.encode(query)).
            show();
    } else {
        $('.next').hide();
    }

    if((!descending && head.offset > 0) || (descending && head.total_rows > head.offset + exports.perPage + 1)) {
        var query = _.extend(req.query, {
            limit: exports.perPage + 1,
            startkey: JSON.stringify(firstRecord.key),
            descending: true
        });
        
        $('.prev').
            attr('href', url + '?' + querystring.encode(query)).
            show();
    } else {
        $('.prev').hide();
    }
};
