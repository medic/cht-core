const environment = require('@medic/environment');

/**
 * Content-Security-Policy directives, shared between routing (which serves the header) and the service worker
 * generation (which mixes them into precache revisions: precached pages are stored and replayed with their
 * response headers, so a CSP change must invalidate the cached pages to actually reach existing clients).
 */
const getDirectives = () => ({
  defaultSrc: [`'none'`],
  fontSrc: [`'self'`],
  manifestSrc: [`'self'`],
  connectSrc: [
    `'self'`,
    `${environment.buildsUrl}/`,
    'maps.googleapis.com', // used for enketo geopoint widget
    'vector.openstreetmap.org', // map tiles, fetched by the webapp and cached by the service worker
  ],
  childSrc: [`'self'`],
  formAction: [`'self'`],
  imgSrc: [
    `'self'`,
    'data:', // unsafe
    'blob:',
    '*.openstreetmap.org', // used for enketo geopoint widget
  ],
  mediaSrc: [
    `'self'`,
    'blob:',
  ],
  scriptSrc: [
    `'self'`,
    // Explicitly allow the telemetry script setting startupTimes
    `'sha256-B5cfIVb4/wnv2ixHP03bHeMXZDszDL610YG5wdDq/Tc='`,
    // AngularJS and several dependencies require this
    `'unsafe-eval'`,
    // Allow Enketo onsubmit form attribute
    // https://github.com/medic/cht-core/issues/6988
    `'unsafe-hashes'`,
    `'sha256-2rvfFrggTCtyF5WOiTri1gDS8Boibj4Njn0e+VCBmDI='`,
  ],
  styleSrc: [
    `'self'`,
    `'unsafe-inline'` // angular-ui-bootstrap
  ],
});

module.exports = { getDirectives };
