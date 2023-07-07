const helmet = require('helmet');

const environment = require('../environment');
const settingsService = require('../services/settings');
const serverUtils = require('../server-utils');

const getConnectSrc = (matomoConfig) => {
  const rules = [
    `'self'`,
    environment.buildsUrl + '/',
    'maps.googleapis.com', // Used for enketo geopoint widget
  ];

  matomoConfig && rules.push(matomoConfig.matomo_server_no_protocol);
  return rules;
};

const getImageSrc = () => {
  return [
    `'self'`,
    'data:', // unsafe
    'blob:',
    '*.openstreetmap.org', // used for enketo geopoint widget
  ];
};

const getScriptSrc = (matomoConfig) => {
  const rules = [
    `'self'`,
    // Explicitly allow the telemetry script setting startupTimes
    `'sha256-B5cfIVb4/wnv2ixHP03bHeMXZDszDL610YG5wdDq/Tc='`,
    // AngularJS and several dependencies require this
    `'unsafe-eval'`,
    // Allow Enketo onsubmit form attribute
    // https://github.com/medic/cht-core/issues/6988
    `'unsafe-hashes'`,
    `'sha256-2rvfFrggTCtyF5WOiTri1gDS8Boibj4Njn0e+VCBmDI='`,
  ];

  if (matomoConfig) {
    rules.push(`'${matomoConfig.matomo_sha}'`);
    rules.push(matomoConfig.matomo_server_no_protocol);
  }

  return rules;
};

const getStyleSrc = () => {
  return [
    `'self'`,
    `'unsafe-inline'` // angular-ui-bootstrap
  ];
};

const getMediaSrc = () => {
  return [
    `'self'`,
    'blob:',
  ];
};

const getMatomoConfig = async () => {
  const settings = await settingsService.get();
  const matomoConfig = settings?.usage_analytics?.webapp;

  return {
    ...matomoConfig,
    // Fixes CSP error on soft-reload
    matomo_server_no_protocol: matomoConfig.matomo_server.replace(/^http(s?):\/\//i, ''),
  };
};

const getPolicy = async (req, res, next) => {
  try {
    const matomoConfig = await getMatomoConfig();

    helmet({
      // Runs with a bunch of defaults: https://github.com/helmetjs/helmet
      hpkp: false, // Explicitly block dangerous header
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [ `'none'` ],
          fontSrc: [ `'self'` ],
          manifestSrc: [ `'self'` ],
          connectSrc: getConnectSrc(matomoConfig),
          childSrc: [ `'self'` ],
          formAction: [ `'self'` ],
          imgSrc: getImageSrc(),
          mediaSrc: getMediaSrc(),
          scriptSrc: getScriptSrc(matomoConfig),
          styleSrc: getStyleSrc(),
        },
        browserSniff: false,
      },
    })(req, res, next);

  } catch (error) {
    serverUtils.error(error, req, res, true);
  }
};

module.exports = {
  getPolicy,
};
