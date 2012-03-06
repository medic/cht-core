exports.perPage = 10;

exports.paginate = function(head, req, firstRecord, lastRecord, path, options) {
    var url,
        baseURL = require('duality/core').getBaseURL(req) + path,
        descending = req.query.descending;

    options = options || {};
    exports.perPage = options.perPage || exports.perPage;
    
    if((head.total_rows > head.offset + exports.perPage) || descending) {
        url = baseURL + '?limit=' + (exports.perPage + 1) + '&startkey="' + lastRecord._id + '"';
        $('.next').attr('href', url).show();
    } else {
        $('.next').hide();
    }

    if((!descending && head.offset > 0) || (descending && head.total_rows > head.offset + exports.perPage + 1)) {
        url = baseURL + '?limit=' + (exports.perPage + 1) + '&descending=true&startkey="' + firstRecord._id + '"';
        $('.prev').attr('href', url).show();        
    } else {
        $('.prev').hide();
    }
};
