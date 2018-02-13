var moment = require('moment');

angular.module('inboxServices').factory('RelativeDate',
  function(
    FormatDate
  ) {
    'use strict';
    'ngInject';

    var config = {
      cssSelector: 'update-relative-date'
    };

    var getDataAttribute = function(key, value) {
      return 'data-' + camelCaseToDash(key) + '="' + value + '"';
    };

    var camelCaseToDash = function(string) {
      return string.replace(/[A-Z]/g, function(match) {
        return '-' + match[0].toLowerCase();
      });
    };

    var skipOptions = ['FormatDate', 'RelativeDate', 'suffix', 'prefix'];

    return {
      getCssSelector: function() {
        return config.cssSelector;
      },
      generateDataset: function(date, options) {
        var dataAttributes = [];
        var momentDate = moment(date);
        dataAttributes.push(getDataAttribute('date', momentDate.valueOf()));

        for (var key in options) {
          if (typeof options[key] !== 'object' && skipOptions.indexOf(key) === -1 && options[key]) {
            dataAttributes.push(getDataAttribute(key, options[key]));
          }
        }

        return dataAttributes.join(' ');
      },
      updateRelativeDates: function () {
        var elements = document.querySelectorAll('.' + config.cssSelector);
        elements.forEach(function(element) {
          var options = Object.assign({}, element.dataset);
          var timestamp = parseInt(options.date);

          var isTimestamp = (new Date(timestamp)).getTime() > 0;
          if (!isTimestamp) {
            return;
          }

          if (options.age) {
            element.textContent = FormatDate.age(timestamp, options);
          } else {
            element.textContent = FormatDate.relative(timestamp, options);
          }
        });
      }
    };
  }
);
