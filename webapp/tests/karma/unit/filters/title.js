describe('title filter', function() {

  'use strict';

  let compile;
  let scope;

  beforeEach(function() {
    module('inboxApp');
    inject(function(_$compile_, _$rootScope_) {
      compile = _$compile_;
      scope = _$rootScope_.$new();
    });
  });

  it('should render nothing when no message', function() {
    scope.forms = [
      { code: 'A', title: 'aye' },
      { code: 'B', title: 'bee' },
      { code: 'C', title: 'sea' }
    ];
    scope.message = undefined;

    const element = compile('<div ng-bind-html="message | title:forms"></div>')(scope);
    scope.$digest();
    chai.expect(element.html()).to.equal('');
  });

  it('should render Incoming Message when no form', function() {
    scope.forms = [
      { code: 'A', title: 'aye' },
      { code: 'B', title: 'bee' },
      { code: 'C', title: 'sea' }
    ];
    scope.message = {};

    const element = compile('<div ng-bind-html="message | title:forms"></div>')(scope);
    scope.$digest();
    chai.expect(element.html()).to.equal('sms_message.message');
  });

  it('should render Outgoing Message when no form and kujua_message is set', function() {
    scope.forms = [
      { code: 'A', title: 'aye' },
      { code: 'B', title: 'bee' },
      { code: 'C', title: 'sea' }
    ];
    scope.message = {
      kujua_message: true
    };

    const element = compile('<div ng-bind-html="message | title:forms"></div>')(scope);
    scope.$digest();
    chai.expect(element.html()).to.equal('Outgoing Message');
  });

  it('should render form title when form', function() {
    scope.forms = [
      { code: 'A', title: 'aye' },
      { code: 'B', title: 'bee' },
      { code: 'C', title: 'sea' }
    ];
    scope.message = {
      form: 'B'
    };

    const element = compile('<div ng-bind-html="message | title:forms"></div>')(scope);
    scope.$digest();
    chai.expect(element.html()).to.equal('bee');
  });

});
