const _ = require('lodash');

let translationCache = {};
let settings = {};
let transitionsLib;

_.templateSettings.interpolate = /\{\{(.+?)\}\}/g;

const getMessage = (value, locale) => {
  const _findTranslation = (value, locale) => {
    if (value.translations) {
      const translation = _.find(value.translations, { locale: locale });
      return translation && translation.content;
    } else {
      // fallback to old translation definition to support
      // backwards compatibility with existing forms
      return value[locale];
    }
  };

  if (!_.isObject(value)) {
    return value;
  }

  let test = false;
  if (locale === 'test') {
    test = true;
    locale = 'en';
  }

  let result =
    // 1) Look for the requested locale
    _findTranslation(value, locale) ||
    // 2) Look for the default
    value.default ||
    // 3) Look for the English value
    _findTranslation(value, 'en') ||
    // 4) Look for the first translation
    (value.translations &&
      value.translations[0] &&
      value.translations[0].content) ||
    // 5) Look for the first value
    value[_.first(_.keys(value))];

  if (test) {
    result = '-' + result + '-';
  }

  return result;
};

module.exports = {
  set: (newSettings) => settings = newSettings,
  setTranslationCache: (newTranslations) => translationCache = newTranslations,
  setTransitionsLib: (newTransitionsLib) => transitionsLib = newTransitionsLib,

  get: key => (key ? settings[key] : settings),
  getAll: () => settings,
  getTranslations: keys => {
    if (!keys) {
      return translationCache;
    }

    const result = {};
    Object.keys(translationCache).forEach(locale => {
      result[locale] = {};
      keys.forEach(key => {
        result[locale][key] = translationCache[locale][key];
      });
    });
    return result;
  },
  translate: (key, locale, ctx) => {
    if (_.isObject(locale)) {
      ctx = locale;
      locale = null;
    }
    locale = locale || (settings && settings.locale) || 'en';
    if (_.isObject(key)) {
      return getMessage(key, locale) || key;
    }
    const value =
      (translationCache[locale] && translationCache[locale][key]) ||
      (translationCache.en && translationCache.en[key]) ||
      key;
    // lodash templates will return ReferenceError if all variables in
    // template are not defined.
    try {
      return _.template(value)(ctx || {});
    } catch (e) {
      return value;
    }
  },
  getTransitionsLib: () => transitionsLib
};
