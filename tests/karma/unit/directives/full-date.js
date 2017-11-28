describe('fullDate directive', function() {
  'use strict';

  var compile;
  var scope;

  var DATETIME_FORMAT_FAKE = 'datetime format';
  var RELATIVE_FORMAT_FAKE = 'relative format';
  var TIME_FORMAT_FAKE = 'time format';

  beforeEach(function() {
    module('inboxApp');

    module(function ($provide) {
      $provide.value('FormatDate', {
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
    it('renders nothing', function() {
      scope.date = undefined;
      var element = compile(
        '<full-date date="date"></full-date>'
      )(scope);
      scope.$digest();

      var expected = '<!-- ngIf: date -->';
      var actual = element.html();

      chai.expect(actual).to.equal(expected);
    });
  });

  context('when a date is passed', function() {
    it('renders a time-ago-auto-update', function () {
      scope.date = moment().valueOf();
      var element = compile(
        '<full-date date="date"></full-date>'
      )(scope);
      scope.$digest();

      var expected = true;
      var actual = !!element[0].querySelector('time-ago-auto-update');

      chai.expect(actual).to.equal(expected);
    });

    it('renders a date in datetime format', function () {
      scope.date = moment().valueOf();
      var element = compile(
        '<full-date date="date"></full-date>'
      )(scope);
      scope.$digest();

      var expected = DATETIME_FORMAT_FAKE;
      var actual = element[0].querySelector('.full-date').innerText;

      chai.expect(actual).to.equal(expected);
    });
  });
});
