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

    var skipOptions = ['FormatDate', 'RelativeDate', 'suffix', 'prefix'];

    return {
      getCssSelector: function() {
        return config.cssSelector;
      },
      generateDataset: function(date, options, absoluteToday) {
        var dataAttributes = {};
        var momentDate = moment(date);

        dataAttributes.date = momentDate.valueOf();
        if (absoluteToday) {
          dataAttributes.absoluteToday = true;
        }

        for (var key in options) {
          if (typeof options[key] !== 'object' && skipOptions.indexOf(key) === -1 && options[key]) {
            dataAttributes[key] = options[key];
          }
        }

        return 'data-date-options=\''+ JSON.stringify(dataAttributes) +'\'';
      },
      updateRelativeDates: function () {
        var elements = document.querySelectorAll('.' + config.cssSelector);
        elements.forEach(function(element) {
          var dataset = element.dataset.dateOptions;
          var options;
          if (!dataset) {
            return;
          }

          try {
            options = JSON.parse(dataset);
          } catch (e) {
            return;
          }

          var timestamp = parseInt(options.date);

          var isTimestamp = (new Date(timestamp)).getTime() > 0;
          if (!isTimestamp) {
            return;
          }

          if (options.age) {
            element.textContent = FormatDate.age(timestamp, options);
          } else if (!options.withoutTime && moment(timestamp).isSame(moment(), 'day') && options.absoluteToday) {
            element.textContent = FormatDate.time(timestamp);
          } else {
            element.textContent = FormatDate.relative(timestamp, options);
          }
        });
      }
    };
  }
);
