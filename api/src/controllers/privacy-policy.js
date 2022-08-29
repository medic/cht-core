const fs = require('fs');
const { promisify } = require('util');
const path = require('path');
const _ = require('lodash');
const serverUtils = require('../server-utils');
const privacyPolicyService = require('../services/privacy-policy');
const config = require('../config');
const cookie = require('../services/cookie');

let template;

const getTemplate = () => {
  if (template) {
    return template;
  }
  const filepath = path.join(__dirname, '..', 'templates', 'privacy-policy', 'index.html');
  template = promisify(fs.readFile)(filepath, { encoding: 'utf-8' })
    .then(file => _.template(file));
  return template;
};

const getHtml = (policy, showBackButton, translations) => {
  return getTemplate()
    .then(template => template({
      policy,
      showBackButton,
      translations
    }));
};

const getLocale = (req) => {
  return cookie.get(req, 'locale'); // if cookie is not set, config.translate will pick the default
};

const getTranslations = (locale) => {
  return {
    back: config.translate('Back', locale),
    login: config.translate('login', locale),
    title: config.translate('privacy.policy', locale)
  };
};

module.exports.get = (req, res) => {
  const showBackButton = !!req.query.back;
  const locale = getLocale(req);
  const translations = getTranslations(locale);
  return privacyPolicyService
    .get(locale)
    .then(content => getHtml(content, showBackButton, translations))
    .then(html => res.send(html))
    .catch(err => {
      serverUtils.error(err, req, res);
    });
};
