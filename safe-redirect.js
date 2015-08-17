var url = require('url');

module.exports = function(appPrefix, requestedRedirect) {
  var redirectPath = null, redirectUrl;

  try {
    redirectUrl = url.parse(requestedRedirect);
    redirectPath = redirectUrl.path + (redirectUrl.hash || '');
  } catch(e) { /* invalid URL.  Will be corrected below */ }

  if(!redirectPath || redirectPath.indexOf(appPrefix) !== 0) {
    return appPrefix;
  }

  return redirectPath;
};
