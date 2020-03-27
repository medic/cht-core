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

    return {
      getCssSelector: function() {
        return config.cssSelector;
      },
      generateDataset: function(date, options, absoluteToday) {
        const dataAttributes = {};
        const momentDate = moment(date);

        dataAttributes.date = momentDate.valueOf();
        if (absoluteToday) {
          dataAttributes.absoluteToday = true;
        }

        for (const key in options) {
          if (typeof options[key] !== 'object' && skipOptions.indexOf(key) === -1 && options[key]) {
            dataAttributes[key] = options[key];
          }
        }

        return 'data-date-options=\''+ JSON.stringify(dataAttributes) +'\'';
      },
      updateRelativeDates: function () {
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
