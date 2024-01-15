const _ = require('lodash');
const assert = require('chai').assert;

const translator = require('../../../../src/js/enketo/translator');

describe('enketo translator', () => {

  beforeEach(() => {
    global.window = {
      CHTCore: {
        Translate: { instant: v => v },
      },
    };
  });

  const assertPassedThroughAs = (expected, key) => {
    it(`should pass through ${key} to $translate.instant as ${expected}`, () => {
      // when
      const actual = translator.t(key);

      // then
      assert.equal(actual, expected);
    });
  };

  describe('#t()', () => {

    _.forEach({
      'some.random.thing': 'enketo.some.random.thing',

      // Months
      'date.month.1': 'Jan',
      'date.month.2': 'Feb',
      'date.month.3': 'Mar',
      'date.month.4': 'Apr',
      'date.month.5': 'May',
      'date.month.6': 'Jun',
      'date.month.7': 'Jul',
      'date.month.8': 'Aug',
      'date.month.9': 'Sep',
      'date.month.10': 'Oct',
      'date.month.11': 'Nov',
      'date.month.12': 'Dec',

      // Days
      'date.dayofweek.0': 'Sun',
      'date.dayofweek.1': 'Mon',
      'date.dayofweek.2': 'Tue',
      'date.dayofweek.3': 'Wed',
      'date.dayofweek.4': 'Thu',
      'date.dayofweek.5': 'Fri',
      'date.dayofweek.6': 'Sat',
      'date.dayofweek.7': 'Sun',

    }, assertPassedThroughAs);

  });

});
