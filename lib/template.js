var mustache = require('mustache'),
    _ = require('underscore'),
    moment = require('moment'),
    config = require('../config'),
    toBikramSambatLetters = require('bikram-sambat').toBik_text;

var configuredFormat = function(date, key) {
  return format(date, config.get(key));
};

var format = function(date, formatString) {
  if (!isNaN(date)) {
    date = parseInt(date, 10);
  }
  return moment(date).format(formatString);
};

var formatters = {
  bikram_sambat_date: function() {
    return function (text, render) {
      return toBikramSambatLetters(format(render(text), 'YYYY-MM-DD'));
    };
  },
  date: function() {
    return function (text, render) {
      return configuredFormat(render(text), 'date_format');
    };
  },
  datetime: function() {
    return function (text, render) {
      return configuredFormat(render(text), 'reported_date_format');
    };
  }
};

exports.render = function(template, view, partials) {
  return mustache.render(
    template,
    _.extend(view, formatters),
    partials
  );
};
