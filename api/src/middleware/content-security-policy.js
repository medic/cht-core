const environment = require('../environment');
const settingsService = require('../services/settings');
const serverUtils = require('../server-utils');

const getConnectSrc = (webappAnalyticsConfig) => {
  const rules = [
    `'self'`,
    environment.buildsUrl + '/',
    'maps.googleapis.com', // Used for enketo geopoint widget
  ];

  if (webappAnalyticsConfig?.server_no_protocol) {
    rules.push(webappAnalyticsConfig.server_no_protocol);
  }

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

const getScriptSrc = (webappAnalyticsConfig) => {
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

  if (webappAnalyticsConfig?.site_sha && webappAnalyticsConfig?.server_no_protocol) {
    rules.push(`'${webappAnalyticsConfig.site_sha}'`);
    rules.push(webappAnalyticsConfig.server_no_protocol);
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

const getUsageAnalyticsConfig = async () => {
  const settings = await settingsService.get();
  const config = settings?.usage_analytics;

  if (!config) {
    return;
  }

  return {
    ...config,
    // Fixes CSP error on soft-reload
    server_no_protocol: config.server_url?.replace(/^http(s?):\/\//i, ''),
  };
};

const get = async (req, res) => {
  try {
    const webappAnalyticsConfig = await getUsageAnalyticsConfig();

    return {
      // Runs with a bunch of defaults: https://github.com/helmetjs/helmet
      hpkp: false, // Explicitly block dangerous header
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [ `'none'` ],
          fontSrc: [ `'self'` ],
          manifestSrc: [ `'self'` ],
          connectSrc: getConnectSrc(webappAnalyticsConfig),
          childSrc: [ `'self'` ],
          formAction: [ `'self'` ],
          imgSrc: getImageSrc(),
          mediaSrc: getMediaSrc(),
          scriptSrc: getScriptSrc(webappAnalyticsConfig),
          styleSrc: getStyleSrc(),
        },
        browserSniff: false,
      },
    };

  } catch (error) {
    serverUtils.error(error, req, res);
  }
};

module.exports = {
  get,
};
