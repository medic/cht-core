describe('timeAgoAutoUpdate directive', function() {
  'use strict';

  var compile;
  var scope;

  var RELATIVE_FORMAT_FAKE = 'relative format';
  var TIME_FORMAT_FAKE = 'time format';

  beforeEach(function() {
    module('inboxApp');

    module(function($provide) {
      $provide.value('FormatDate', {
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

  context('when the date is today', function() {
    it('renders time in time format', function() {
      scope.date = moment().valueOf();
      var element = compile(
        '<time-ago-auto-update date="date"></time-ago-auto-update>'
      )(scope);
      scope.$digest();

      var expected = TIME_FORMAT_FAKE;
      var actual = element.text();

      chai.expect(actual).to.equal(expected);
    });
  });

  context('when the date is not today', function() {
    it('renders time in relative format', function() {
      // some time in the past
      scope.date = moment('2017-10-10T10:10:10.100').valueOf();
      var element = compile(
        '<time-ago-auto-update date="date"></time-ago-auto-update>'
      )(scope);
      scope.$digest();

      var expected = RELATIVE_FORMAT_FAKE;
      var actual = element.text();

      chai.expect(actual).to.equal(expected);
    });
  });
});
