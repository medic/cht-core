describe('relativeDate directive', function() {
  'use strict';

  var compile;
  var scope;

  var DATE_FORMAT_FAKE = 'date format';
  var DATETIME_FORMAT_FAKE = 'datetime format';
  var RELATIVE_FORMAT_FAKE = 'relative format';
  var TIME_FORMAT_FAKE = 'time format';

  function getParentSpanWithTitle (element) {
    return element[0].querySelectorAll('span')[1];
  }

  beforeEach(function() {
    module('inboxApp');

    module(function ($provide) {
      $provide.value('FormatDate', {
        date: function() {
          return DATE_FORMAT_FAKE;
        },
        datetime: function() {
          return DATETIME_FORMAT_FAKE;
        },
        relative: function() {
          return RELATIVE_FORMAT_FAKE;
        },
        time: function() {
          return TIME_FORMAT_FAKE;
        }
      });
    });

    inject(function(_$compile_, _$rootScope_) {
      compile = _$compile_;
      scope = _$rootScope_;
    });
  });

  context('when no date is passed', function() {
    it('renders only an empty span', function() {
      scope.date = undefined;
      var element = compile(
        '<relative-date date="date"></relative-date>'
      )(scope);
      scope.$digest();

      var expected = '<span><!-- ngIf: date --></span>';
      var actual = element.html();

      chai.expect(actual).to.equal(expected);
    });
  });

  context('when a date is passed', function() {
    it('renders a span with a title of datetime format', function () {
      scope.date = moment().valueOf();
      var element = compile(
        '<relative-date date="date"></relative-date>'
      )(scope);
      scope.$digest();

      var expected = DATETIME_FORMAT_FAKE;
      var actual = getParentSpanWithTitle(element).title;

      chai.expect(actual).to.equal(expected);
    });
  });
});
