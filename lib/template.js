var mustache = require('mustache'),
    _ = require('underscore'),
    moment = require('moment'),
    config = require('../config');

var formatters = {
  datetime: function() {
    return function (text, render) {
      var format = config.get('reported_date_format');
      return moment(render(text)).format(format);
    }
  }
};

exports.render = function(template, view, partials) {
  return mustache.render(
    template,
    _.extend(view, formatters),
    partials
  );
};