describe('Debounce Service', () => {
  'use strict';

  let $timeout,
      service,
      callback,
      counter;

  describe('Actual debouncing', () => {
    beforeEach(function() {
      module('inboxApp');
      inject(function(_Debounce_, _$timeout_) {
        service = _Debounce_;
        $timeout = _$timeout_;
      });

      callback = sinon.stub();
      callback.callsFake(() => {
        counter++;
        return counter;
      });
      counter = 0;
    });

    it('should callback after wait interval', () => {
      service(callback, 50)();
      chai.expect(callback.callCount).to.equal(0);
      $timeout.flush(50);
      chai.expect(callback.callCount).to.equal(1);
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
      chai.expect(counter).to.equal(1);
      debounced();
      $timeout.flush(51);
      debounced();
      $timeout.flush(51);
      chai.expect(callback.callCount).to.equal(3);
      chai.expect(counter).to.equal(3);
    });

    it('should call immediately when using immediate', () => {
      service(callback, 50, true)();
      chai.expect(callback.callCount).to.equal(1);
      $timeout.flush(50);
      chai.expect(callback.callCount).to.equal(1);
      chai.expect(counter).to.equal(1);
    });

    it('should only callback once for multiple within-wait-interval calls when using immediate', () => {
      const debounced = service(callback, 50, true);
      debounced();
      chai.expect(callback.callCount).to.equal(1);
      $timeout.flush(25);
      debounced();
      $timeout.flush(44);
      debounced();
      $timeout.flush(50);
      chai.expect(callback.callCount).to.equal(1);
      chai.expect(counter).to.equal(1);
    });

    it('should not callback if canceled', () => {
      const debounced = service(callback, 50);
      debounced();
      $timeout.flush(25);
      debounced.cancel();
      $timeout.flush(25);
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
      $timeout.flush(35);
      chai.expect(callback.callCount).to.equal(0);
    });

    it('should not callback if canceled, when using immediate', () => {
      const debounced = service(callback, 50, true);
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
      debounced(10);
      $timeout.flush(25);
      debounced(11);
      $timeout.flush(43);
      debounced(12);
      $timeout.flush(50);
      chai.expect(callback.callCount).to.equal(1);
      chai.expect(callback.args[0][0]).to.equal(12);
    });

    it('should pass the arguments from the first call to the callback, when using immediate', () => {
      const debounced = service(callback, 50, true);
      debounced(10);
      $timeout.flush(25);
      debounced(11);
      $timeout.flush(43);
      debounced(12);
      $timeout.flush(50);
      chai.expect(callback.callCount).to.equal(1);
      chai.expect(callback.args[0][0]).to.equal(10);
    });

    it('should return the result from the first call, when using immediate', () => {
      const debounced = service(callback, 50, true);
      callback.returnsArg(0);
      chai.expect(debounced(10)).to.equal(10);
      $timeout.flush(25);
      chai.expect(debounced(11)).to.equal(10);
      $timeout.flush(43);
      chai.expect(debounced(12)).to.equal(10);
      $timeout.flush(50);
      chai.expect(callback.callCount).to.equal(1);
    });

    it('should create independent debounced functions', () => {
      const debounced1 = service(callback, 50);
      const debounced2 = service(callback, 50);
      debounced1(10);
      debounced2(10);
      debounced1(20);
      debounced2(20);
      $timeout.flush(50);
      chai.expect(callback.callCount).to.equal(2);
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
      callback.callsFake(() => {
        counter++;
        return counter;
      });
      counter = 0;
    });

    it('$timeout should receive correct arguments', () => {
      let debounced = service(callback, 50, false, true);
      debounced();
      chai.expect($timeout.callCount).to.equal(1);
      chai.expect($timeout.args[0][1]).to.equal(50);
      chai.expect($timeout.args[0][2]).to.equal(true);
      debounced = service(callback, 10, false, false);
      debounced();
      chai.expect($timeout.callCount).to.equal(2);
      chai.expect($timeout.args[1][1]).to.equal(10);
      chai.expect($timeout.args[1][2]).to.equal(false);
      debounced = service(callback, 12, false);
      debounced();
      chai.expect($timeout.callCount).to.equal(3);
      chai.expect($timeout.args[2][1]).to.equal(12);
      chai.expect($timeout.args[2][2]).to.equal(undefined);
    });
  });
});
