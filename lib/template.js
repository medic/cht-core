var mustache = require('mustache'),
    _ = require('underscore'),
    moment = require('moment'),
    config = require('../config');

var format = function(date, key) {
  if (!isNaN(date)) {
    date = parseInt(date, 10);
  }
  return moment(date).format(config.get(key));
};

var formatters = {
  date: function() {
    return function (text, render) {
      return format(render(text), 'date_format');
    };
  },
  datetime: function() {
    return function (text, render) {
      return format(render(text), 'reported_date_format');
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