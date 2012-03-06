var perPage = 10;

exports.paginate = function(head, req, firstRecord, lastRecord, path, options) {
    var url,
        baseURL = require('duality/core').getBaseURL(req) + path;

    options = options || {};
    perPage = options.perPage || perPage;

    if(head.total_rows > head.offset + perPage) {
        url = baseURL + '?limit=' + (perPage + 1) + '&startkey="' + lastRecord._id + '"';
        $('.next').attr('href', url).show();
    } else {
        $('.next').hide();
    }

    if(head.offset > 0) {
        url = baseURL + '?limit=' + (perPage + 1) + '&skip=1&descending=true&startkey="' + firstRecord._id + '"';
        $('.prev').attr('href', url).show();        
    } else {
        $('.prev').hide();
    }
};
