const fs = require('fs');
const { promisify } = require('util');
const path = require('path');
const _ = require('lodash');
const serverUtils = require('../server-utils');
const privacyPolicyService = require('../services/privacy-policy');
const config = require('../config');

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

// TODO do magic here - make library out of changes in this PR
//      https://github.com/medic/cht-core/pull/7588
const getLocale = () => {
  return 'en';
}

const getTranslations = () => {
  const locale = getLocale();
  return {
    back: config.translate('Back', locale),
    login: config.translate('login', locale),
    title: config.translate('privacy.policy', locale)
  };
}

module.exports.get = (req, res) => {
  const showBackButton = !!req.query.back;
  const translations = getTranslations();
  privacyPolicyService
    .get()
    .then(content => getHtml(content, showBackButton, translations))
    .then(html => res.send(html))
    .catch(err => {
      serverUtils.error(err, req, res);
    });
};
