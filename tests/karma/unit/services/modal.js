describe('Modal service', function() {

  'use strict';

  var service, uibModalStub;

  beforeEach(function() {
    module('inboxApp');
    uibModalStub = sinon.stub();
    uibModalStub.returns({result: 'result'});
    module(function ($provide) {
      $provide.factory('$uibModal', function() {
        return { open: uibModalStub };
      });
    });
    inject(function(_Modal_) {
      service = _Modal_;
    });
  });

  it('passed args to uibModal', function() {
    var options = {
      templateUrl: 'url',
      controller: 'controller',
      args: {
        someValue: 123,
        someFunc: function() { return 'hello'; }
      }
    };
    service(options);

    chai.expect(uibModalStub.called).to.equal(true);
    var actual = uibModalStub.getCall(0).args[0];
    chai.expect(actual.templateUrl).to.equal(options.templateUrl);
    chai.expect(actual.controller).to.equal(options.controller);
    chai.expect(actual.resolve.someValue()).to.equal(options.args.someValue);
    chai.expect(actual.resolve.someFunc()()).to.equal(options.args.someFunc());
  });
});