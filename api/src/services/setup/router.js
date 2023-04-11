const express = require('express');
const router = express.Router();
const path = require('path');
const localeUtils = require('locale');
const morgan = require('morgan');

const environment = require('../../environment');
const startupLog = require('./startup-log');

const { wantsJSON } = require('../../middleware/wants-json');
const { getLocale } = require('../../middleware/locale');
const logger = require('../../logger');
const translations = require('../../translations');
const config = require('../../config');
const template = require('../template');
const branding = require('../../services/branding');
const STATUS = 503;

router.use(express.static(environment.staticPath));
router.use(getLocale);
router.use(
  morgan('STARTUP RES :remote-addr :remote-user :method :url HTTP/:http-version :status :res[content-length]')
);

const getEnabledLocales = () => {
  return translations
    .getEnabledLocales()
    .then(docs => docs.map(doc => doc.code))
    .catch(err => {
      logger.error('Error getting enabled locales: %o', err);
      return [];
    });
};

const getBestLocaleCode = (acceptedLanguages, locales, defaultLocale) => {
  const headerLocales = new localeUtils.Locales(acceptedLanguages);
  const supportedLocales = new localeUtils.Locales(locales, defaultLocale);
  return headerLocales.best(supportedLocales).language;
};

const getTemplate = async () => {
  const templatePath = path.join(environment.templatePath, 'setup', 'setup.html');
  return template.getTemplate(templatePath);
};

const renderStartupPage = async (req) => {
  const enabledLocales = await getEnabledLocales();
  const locale = getBestLocaleCode(req.locale, enabledLocales, config.get('locale'));
  const progress = startupLog.getProgress(locale);

  const template = await getTemplate();
  return template({
    title: config.translate('api.startup.title', locale, { branding: await branding.get() }),
    actions: progress.actions,
    locale: locale,
  });
};

router.get('/api/v1/startup-progress', (req, res) => {
  res.json(startupLog.getProgress(req.locale));
});

router.all('*', wantsJSON, (req, res) => {
  res.status(STATUS);
  res.json({ error: 'Service unavailable' });
});

router.all('*', async (req, res) => {
  const page = await renderStartupPage(req);
  res.send(page);
});

module.exports = {
  router,
};
