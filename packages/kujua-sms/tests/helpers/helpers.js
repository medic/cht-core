var querystring = require('querystring');

exports.rand = function(from, to) {
    from = from || 10000000000;
    to = to || 99999999999;
    return Math.floor(Math.random() * (to - from + 1) + from);
};

exports.headers = function(data) {
    return {
        "Content-Length": querystring.stringify(data).length,
        "Content-Type":"application/x-www-form-urlencoded",
        "Host": window.location.host
    };
};