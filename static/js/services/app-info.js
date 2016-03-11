var _ = require('underscore'),
    moment = require('moment');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  var settings;

  inboxServices.factory('AppInfo', ['Settings',
    function(Settings) {
      return function() {
        return Settings().then(function(res) {
          settings = res;
          return {
            getForm: getForm,
            getMessage: getMessage,
            translate: translate,
            formatDate: formatDate
          };
        });
      };
    }
  ]);

  var getForm = function(code) {
    return settings.forms && settings.forms[code];
  };

  var getMessage = function(value, locale) {
    function _findTranslation(value, locale) {
      if (value.translations) {
        var translation = _.findWhere(
          value.translations, { locale: locale }
        );
        return translation && translation.content;
      } else {
        // fallback to old translation definition to support
        // backwards compatibility with existing forms
        return value[locale];
      }
    }

    if (!_.isObject(value)) {
      return value;
    }

    var test = false;
    if (locale === 'test') {
      test = true;
      locale = 'en';
    }

    var result =

      // 1) Look for the requested locale
      _findTranslation(value, locale) ||

      // 2) Look for the default
      value.default ||

      // 3) Look for the English value
      _findTranslation(value, 'en') ||

      // 4) Look for the first translation
      (value.translations && value.translations[0] &&
          value.translations[0].content) ||

      // 5) Look for the first value
      value[_.first(_.keys(value))];

    if (test) {
      result = '-' + result + '-';
    }

    return result;
  };

  var translate = function(key, locale, ctx) {
    if (_.isObject(locale)) {
      ctx = locale;
      locale = settings.locale;
    } else {
      ctx = ctx || {};
      locale = locale || settings.locale;
    }

    if (_.isObject(key)) {
      return getMessage(key, locale) || key;
    }

    var translated = _.findWhere(settings.translations, { key: key });
    var value = getMessage(translated, locale) || key;

    // underscore templates will return ReferenceError if all variables in
    // template are not defined.
    try {
      return _.template(value)(ctx);
    } catch(e) {
      return value;
    }
  };

  var formatDate = function(date) {
    if (!date) {
        return;
    }
    var m = moment(date);
    return m.format(settings.date_format) + 
      ' (' + m.fromNow() + ')';
  };

}());