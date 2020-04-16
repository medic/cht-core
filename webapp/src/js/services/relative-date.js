const moment = require('moment');

angular.module('inboxServices').factory('RelativeDate',
  function(
    FormatDate
  ) {
    'use strict';
    'ngInject';

    const config = {
      cssSelector: 'update-relative-date'
    };

    const skipOptions = ['FormatDate', 'RelativeDate', 'suffix', 'prefix'];

    const getRelativeDate = function(timestamp, options) {
      if (options.age) {
        return FormatDate.age(timestamp, options);
      }
      if (!options.withoutTime && moment(timestamp).isSame(moment(), 'day') && options.absoluteToday) {
        return FormatDate.time(timestamp);
      }
      return FormatDate.relative(timestamp, options);
    };

    return {
      getRelativeDate,
      getCssSelector: function() {
        return config.cssSelector;
      },
      generateDataset: function(date, options) {
        const dataAttributes = {};
        const momentDate = moment(date);

        dataAttributes.date = momentDate.valueOf();

        for (const key in options) {
          if (typeof options[key] !== 'object' && skipOptions.indexOf(key) === -1 && options[key]) {
            dataAttributes[key] = options[key];
          }
        }

        return `data-date-options='${JSON.stringify(dataAttributes)}'`;
      },
      updateRelativeDates: function() {
        const elements = document.querySelectorAll('.' + config.cssSelector);
        elements.forEach(function(element) {
          const dataset = element.dataset.dateOptions;
          let options;
          if (!dataset) {
            return;
          }

          try {
            options = JSON.parse(dataset);
          } catch (e) {
            return;
          }

          const timestamp = parseInt(options.date);

          const isTimestamp = (new Date(timestamp)).getTime() > 0;
          if (!isTimestamp) {
            return;
          }

          element.textContent = getRelativeDate(timestamp, options);
        });
      }
    };
  }
);
