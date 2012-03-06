var querystring = require('querystring'),
    _ = require('underscore')._;

exports.perPage = 10;

exports.paginate = function(head, req, firstRecord, lastRecord, path, options) {
    var baseURL = require('duality/core').getBaseURL(req),
        descending = req.query.descending,
        url = baseURL + path;

    options = options || {};
    exports.perPage = options.perPage || exports.perPage;
    
    delete req.query.descending;
    
    if((head.total_rows > head.offset + exports.perPage) || descending) {
        var query = _.extend(req.query, {
            limit: exports.perPage + 1,
            startkey: JSON.stringify(lastRecord._id)
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
            startkey: JSON.stringify(firstRecord._id),
            descending: true
        });
        
        $('.prev').
            attr('href', url + '?' + querystring.encode(query)).
            show();
    } else {
        $('.prev').hide();
    }
};
