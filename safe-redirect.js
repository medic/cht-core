var url = require('url');

module.exports = function(appPrefix, requestedRedirect) {
  var redirectPath = null;

  try {
    redirectPath = url.resolve('/', requestedRedirect);
  } catch(e) { /* invalid URL.  Will be corrected below */ }

  if(!redirectPath || redirectPath.indexOf(appPrefix) !== 0) {
    return appPrefix;
  }

  return redirectPath;
};
