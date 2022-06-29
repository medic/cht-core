const express = require('express');
const router = express.Router();
const path = require('path');
const localeUtils = require('locale');
const _ = require('lodash');
const fs = require('fs');

const environment = require('../../environment');
const startupLog = require('./startup-log');

const { wantsJSON } = require('../../middleware/wants-json');
const db = require('../../db');
const logger = require('../../logger');
const translations = require('../../translations');
const config = require('../../config');
const STATUS = 503;

router.use(express.static(environment.staticPath));

// todo
// master contains a library for branding, replace this with that library when merging
const getBranding = () => {
  return db.medic.get('branding')
    .then(doc => ({ name: doc.title }))
    .catch(err => {
      logger.warn('Could not find branding doc on CouchDB: %o', err);
      return { name: 'Medic' };
    });
};

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

const renderStartupPage = async (req) => {
  const acceptLanguageHeader = req && req.headers && req.headers['accept-language'];
  const enabledLocales = await getEnabledLocales();
  const locale = getBestLocaleCode(acceptLanguageHeader, enabledLocales, config.get('locale'));

  const templatePath = path.join(environment.templatePath, 'setup', 'setup.html');
  const fileContents = await fs.promises.readFile(templatePath, 'utf8');
  const template = _.template(fileContents);

  return template({
    title: config.translate('api.startup.title', locale, { branding: await getBranding() }),
    locale: locale,
  });
};

router.get('/progress', (req, res) => {
  const locale = req && req.headers && req.headers['accept-language'];
  res.json(startupLog.getProgress(locale));
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
