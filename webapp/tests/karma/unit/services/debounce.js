describe('Debounce Service', () => {
  'use strict';

  let $timeout;
  let service;
  let callback;

  describe('Actual debouncing', () => {
    beforeEach(function() {
      module('inboxApp');
      inject(function(_Debounce_, _$timeout_) {
        service = _Debounce_;
        $timeout = _$timeout_;
      });

      callback = sinon.stub();
    });

    it('should callback after wait interval', () => {
      const debounced = service(callback, 50);
      debounced();
      chai.expect(callback.callCount).to.equal(0);
      $timeout.flush(50);
      chai.expect(callback.callCount).to.equal(1);
      chai.expect(debounced.executed()).to.equal(true);
    });

    it('should not callback when using incorrect arguments', () =>{
      chai.expect(service.bind(service, callback, -200)).to.throw();
      chai.expect(callback.callCount).to.equal(0);

      chai.expect(service.bind(service, callback, 'test')).to.throw();
      chai.expect(callback.callCount).to.equal(0);

      chai.expect(service.bind(service, callback, 'a', 'b')).to.throw();
      chai.expect(callback.callCount).to.equal(0);
    });

    it('should only callback once for multiple within-wait-interval calls', () => {
      const debounced = service(callback, 50);
      debounced();
      $timeout.flush(25);
      debounced();
      $timeout.flush(44);
      debounced();
      $timeout.flush(45);
      chai.expect(callback.callCount).to.equal(0);
      $timeout.flush(5);
      chai.expect(callback.callCount).to.equal(1);
      debounced();
      $timeout.flush(50);
      debounced();
      $timeout.flush(50);
      chai.expect(callback.callCount).to.equal(3);
    });

    it('should call on maxDelay, even with multiple within-wait-interval calls', () => {
      const debounced = service(callback, 50, 110);
      debounced();
      $timeout.flush(40);
      debounced();
      $timeout.flush(40);
      debounced();
      $timeout.flush(40);
      debounced();
      $timeout.flush(150);
      chai.expect(callback.callCount).to.equal(2);
    });

    it('should not call on maxDelay when maxDelay is lower than wait', () => {
      const debounced = service(callback, 50, 40);
      debounced();
      $timeout.flush(40);
      debounced();
      $timeout.flush(40);
      debounced();
      $timeout.flush(40);
      debounced();
      $timeout.flush(100);
      chai.expect(callback.callCount).to.equal(1);
    });

    it('should call on every maxDelay', () => {
      const debounced = service(callback, 10, 27);
      for (let i = 0; i < 10; i++) {
        debounced();
        $timeout.flush(9);
      }
      $timeout.flush(50);
      chai.expect(callback.callCount).to.equal(4);
    });

    it('should call immediately when using immediate', () => {
      service(callback, 50, 0, true)();
      chai.expect(callback.callCount).to.equal(1);
      $timeout.flush(50);
      chai.expect(callback.callCount).to.equal(1);
    });

    it('should only callback once for multiple within-wait-interval calls when using immediate', () => {
      const debounced = service(callback, 50, 0, true);
      debounced();
      chai.expect(callback.callCount).to.equal(1);
      $timeout.flush(25);
      debounced();
      $timeout.flush(44);
      debounced();
      $timeout.flush(50);
      chai.expect(callback.callCount).to.equal(1);
    });

    it('should not callback if canceled', () => {
      const debounced = service(callback, 50);
      debounced();
      chai.expect(debounced.cancelled()).to.equal(false);
      $timeout.flush(25);
      debounced.cancel();
      $timeout.flush(50);
      chai.expect(debounced.cancelled()).to.equal(true);
      chai.expect(callback.callCount).to.equal(0);
    });

    it('should not callback if canceled, using maxDelay', () => {
      const debounced = service(callback, 50, 100);
      debounced();
      chai.expect(debounced.cancelled()).to.equal(false);
      $timeout.flush(25);
      debounced.cancel();
      $timeout.flush(100);
      chai.expect(debounced.cancelled()).to.equal(true);
      chai.expect(callback.callCount).to.equal(0);

    });

    it('should not callback if canceled with multiple within-wait-interval calls', () => {
      const debounced = service(callback, 50);
      debounced();
      $timeout.flush(25);
      debounced();
      $timeout.flush(43);
      debounced();
      $timeout.flush(15);
      debounced.cancel();
      $timeout.flush(100);
      chai.expect(callback.callCount).to.equal(0);
    });

    it('should not callback if canceled with multiple within-wait-interval calls, using maxDelay', () => {
      const debounced = service(callback, 50, 100);
      debounced();
      $timeout.flush(25);
      debounced();
      $timeout.flush(15);
      debounced();
      $timeout.flush(15);
      debounced.cancel();
      $timeout.flush(150);
      chai.expect(callback.callCount).to.equal(0);
    });

    it('should not use maxDelay with immediate', () => {
      const debounced = service(callback, 50, 100, true);
      debounced();
      chai.expect(callback.callCount).to.equal(1);
      $timeout.flush(49);
      debounced();
      $timeout.flush(49);
      debounced();
      $timeout.flush(49);
      debounced();
      $timeout.flush(150);
      chai.expect(callback.callCount).to.equal(1);
    });

    it('should not callback if canceled, when using immediate', () => {
      const debounced = service(callback, 50, 0, true);
      debounced(1);
      debounced.cancel();
      chai.expect(callback.callCount).to.equal(1);
      chai.expect(callback.args[0][0]).to.equal(1);
      debounced(2);
      debounced.cancel();
      chai.expect(callback.callCount).to.equal(2);
      chai.expect(callback.args[1][0]).to.equal(2);
    });

    it('should pass the arguments from the last call to the callback', () => {
      const debounced = service(callback, 50);
      debounced(1);
      $timeout.flush(25);
      debounced(2);
      $timeout.flush(43);
      debounced(3);
      $timeout.flush(100);
      chai.expect(callback.callCount).to.equal(1);
      chai.expect(callback.args[0][0]).to.equal(3);
    });

    it('should pass the arguments from the last call to the callback, when using maxDelay', () => {
      const debounced = service(callback, 50, 100);
      debounced(1);
      $timeout.flush(40);
      debounced(2);
      $timeout.flush(40);
      debounced(3);
      $timeout.flush(40);
      debounced(4);
      $timeout.flush(150);
      chai.expect(callback.callCount).to.equal(2);
      chai.expect(callback.args[0][0]).to.equal(3);
      chai.expect(callback.args[1][0]).to.equal(4);
    });

    it('should pass the arguments from the first call to the callback, when using immediate', () => {
      const debounced = service(callback, 50, 0, true);
      debounced(10);
      $timeout.flush(25);
      debounced(11);
      $timeout.flush(43);
      debounced(12);
      $timeout.flush(100);
      chai.expect(callback.callCount).to.equal(1);
      chai.expect(callback.args[0][0]).to.equal(10);
    });

    it('should return the result from the first call, when using immediate', () => {
      const debounced = service(callback, 50, 0, true);
      callback.returnsArg(0);
      chai.expect(debounced(10)).to.equal(10);
      $timeout.flush(25);
      chai.expect(debounced(11)).to.equal(10);
      $timeout.flush(43);
      chai.expect(debounced(12)).to.equal(10);
      $timeout.flush(100);
      chai.expect(callback.callCount).to.equal(1);
    });

    it('should create independent debounced functions', () => {
      const debounced1 = service(callback, 50);
      const debounced2 = service(callback, 50);
      debounced1(1);
      debounced2(2);
      debounced1(1);
      debounced2(2);
      $timeout.flush(100);
      chai.expect(callback.callCount).to.equal(2);
      chai.expect(callback.args[0][0]).to.equal(1);
      chai.expect(callback.args[1][0]).to.equal(2);
    });

    it('should set executed correctly with wait', () => {
      const debounced = service(callback, 1000);
      debounced();
      chai.expect(debounced.executed()).to.equal(false);
      $timeout.flush(100);
      chai.expect(debounced.executed()).to.equal(false);
      $timeout.flush(1000);
      chai.expect(debounced.executed()).to.equal(true);
    });

    it('should set executed correctly with immediate', () => {
      const debounced = service(callback, 1000, 0, true);
      debounced();
      chai.expect(debounced.executed()).to.equal(true);
      $timeout.flush(100);
      chai.expect(debounced.executed()).to.equal(true);
      $timeout.flush(1000);
      chai.expect(debounced.executed()).to.equal(true);
    });

    it('should set executed correctly with maxDelay', () => {
      const debounced = service(callback, 1000, 2000);
      debounced();
      chai.expect(debounced.executed()).to.equal(false);
      $timeout.flush(500);
      chai.expect(debounced.executed()).to.equal(false);
      debounced(1);
      chai.expect(debounced.executed()).to.equal(false);
      $timeout.flush(500);
      chai.expect(debounced.executed()).to.equal(false);
      debounced(2);
      chai.expect(debounced.executed()).to.equal(false);
      $timeout.flush(600);
      debounced(3);
      chai.expect(debounced.executed()).to.equal(false);
      $timeout.flush(500);
      chai.expect(debounced.executed()).to.equal(true);

      chai.expect(callback.callCount).to.equal(1);
    });
  });


  describe('Interaction with $timeout service', () => {
    beforeEach(function() {
      $timeout = sinon.stub();
      $timeout.cancel = sinon.stub();

      module('inboxApp');
      module(function ($provide) {
        $provide.value('$timeout', $timeout);
      });
      inject(function(_Debounce_) {
        service = _Debounce_;
      });

      callback = sinon.stub();
    });

    it('$timeout should receive correct wait argument', () => {
      service(callback, 50)();
      chai.expect($timeout.callCount).to.equal(1);
      chai.expect($timeout.args[0][1]).to.equal(50);
      chai.expect($timeout.args[0][2]).to.equal(false);
    });

    it('$timeout should receive correct maxDelay argument', () => {
      service(callback, 50, 100)();
      chai.expect($timeout.callCount).to.equal(2);
      chai.expect($timeout.args[0][1]).to.equal(50);
      chai.expect($timeout.args[0][2]).to.equal(false);
      chai.expect($timeout.args[1][1]).to.equal(100);
      chai.expect($timeout.args[1][2]).to.equal(false);
    });

    it('$timeout should receive correct invokeApply value - true', () => {
      service(callback, 50, 100, false, true)();
      chai.expect($timeout.callCount).to.equal(2);
      chai.expect($timeout.args[0][1]).to.equal(50);
      chai.expect($timeout.args[0][2]).to.equal(true);
      chai.expect($timeout.args[1][1]).to.equal(100);
      chai.expect($timeout.args[1][2]).to.equal(true);
    });

    it('$timeout should receive correct invokeApply value - false', () => {
      service(callback, 50, 100, false, false)();
      chai.expect($timeout.callCount).to.equal(2);
      chai.expect($timeout.args[0][1]).to.equal(50);
      chai.expect($timeout.args[0][2]).to.equal(false);
      chai.expect($timeout.args[1][1]).to.equal(100);
      chai.expect($timeout.args[1][2]).to.equal(false);
    });
  });
});
