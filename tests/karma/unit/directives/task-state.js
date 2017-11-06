describe('taskState directive', function() {
  'use strict';

  var compile;
  var scope;

  var FAKE_STATE = 'pending';

  beforeEach(function() {
    module('inboxApp');

    inject(function(_$compile_, _$rootScope_) {
      compile = _$compile_;
      scope = _$rootScope_;
    });
  });

  it('renders a span with a proper className', function () {
    scope.state = FAKE_STATE;
    var element = compile(
      '<task-state state="state"></task-state>'
    )(scope);
    scope.$digest();

    var expected = 'state ' + FAKE_STATE;
    var actual = element[0].querySelector('span').className;

    chai.expect(actual).to.equal(expected);
  });

  it('renders a proper label', function () {
    scope.state = FAKE_STATE;
    var element = compile(
      '<task-state state="state"></task-state>'
    )(scope);
    scope.$digest();

    var expected = 'state.' + FAKE_STATE;
    var actual = element[0].querySelector('span').innerText;

    chai.expect(actual).to.equal(expected);
  });
});
