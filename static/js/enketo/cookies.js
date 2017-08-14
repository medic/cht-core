module.exports = function() {
  var cookies = {};

  document.cookie.split(';')
    .forEach(function( s ) {
      var c = s.trim().split('=');
      var key = c[0];
      var val = c[1];
      cookies[key] = val;
    });

  return cookies;
};
