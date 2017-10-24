const DALVIK_DETECT = new RegExp('^Dalvik/');

/**
 * Check an incoming request to see if it's from a human browser, or from an
 * app calling an API.  Err on the side of caution - if not sure, this function
 * will assume it's a human.
 *
 * N.B. medic-collect and ODK Collect do not always include a UA:
 * https://github.com/opendatakit/collect/issues/167
 */
module.exports = (req) => {
  const ua = req.headers && req.headers['user-agent'];

  if (!ua) {
    return false;
  }

  if (DALVIK_DETECT.test(ua)) {
    return !(ua.includes('medic.gateway') || ua.includes('.collect.android'));
  }

  return true;
};
