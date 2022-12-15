const branding = require('../services/branding');

const CACHE_MAX_AGE = 7 * 24 * 60 * 60; // one week in seconds

module.exports = {
  get: async (req, res) => {
    // Cache for a week. Normally we don't interfere with couch headers, but
    // due to Chrome (including Android WebView) aggressively requesting
    // favicons on every page change and window.history update
    // ( https://github.com/medic/medic/issues/1913 ), we have to
    // stage an intervention
    
    const icon = await branding.getFavicon();
    res.setHeader('Cache-Control', `public, max-age=${CACHE_MAX_AGE}`);
    res.set('Content-Type', icon.contentType);
    res.send(icon.data);
  }
};
